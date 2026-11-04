// The current job's instructions for the shell's map screen (M). GTA2 shows a job's
// instructions only as briefs (the text with a gang face at the bottom of the screen) that
// scroll away; the port keeps the latest ones here so the map can show them again.
//
// Called once per frame. The log lives in the game's memory, so a save keeps it.
// - Every brief is logged (a repeated one moves to the end), newest last, at most kMaxBriefs.
// - When a job starts (the script's mission flag, which also hides the phone arrows), briefs
//   older than kJobLeadMs go: the job's first instructions come with the phone call, just
//   before the flag is set.
#include <emscripten.h>
#include <stdio.h>
#include <string.h>
#include <wchar.h>

#include "Game_0x40.hpp"
#include "Hud.hpp"
#include "hud_message_priority.hpp"
#include "ScriptManager_C1EA8.hpp"
#include "text_0x14.hpp"

extern "C" double gta2_port_now_ms();

namespace
{
constexpr int kMaxBriefs = 8;
constexpr int kBriefLen = 320;
constexpr double kJobLeadMs = 8000;

// Read by web/map.js (gta2_port_job_briefs): job/count/faces, timestamps,
// UTF-16 texts, eight-byte GXT keys and whether the engine is drawing a current
// brief. Keep the existing text offset stable for the wasm reader.
struct JobBriefs
{
    s32 onJob;
    s32 count;
    s32 face[kMaxBriefs];
    double shownAt[kMaxBriefs];
    wchar_t text[kMaxBriefs][kBriefLen];
    char gxtKey[kMaxBriefs][8];
    s32 active;
};
JobBriefs gJob;
bool gNativeBriefTextHidden = false;
int gMissionTitleKey = 0;
bool gMissionTitleTextHidden = false;
double gMissionTitleLastSeenMs = 0.0;

bool IsMissionTitleKey(int key)
{
    return (key >= 1970 && key <= 1988) || (key >= 2460 && key <= 2470) ||
           (key >= 2671 && key <= 2674) || key == 1952 || key == 1953 || key == 1955 || key == 2473 ||
           (key >= 2954 && key <= 2959) || (key >= 3840 && key <= 3861) ||
           key == 1016 || key == 1017 || key == 1018 || key == 1124 || key == 1125 || key == 1338 || key == 1339 ||
           key == 2998 || key == 2999 || key == 3100 || key == 3730 ||
           key == 3670 || key == 3672 || key == 3674 || key == 6147 ||
           key == 6184 || key == 6185 || key == 6186 ||
           (key >= 9001 && key <= 9004);
}

// The brief last seen on screen, so it is formatted and logged once.
char gSeenKey[8];
s32 gSeenParam = -2;

void Drop(int i)
{
    for (int j = i; j + 1 < gJob.count; ++j)
    {
        gJob.face[j] = gJob.face[j + 1];
        gJob.shownAt[j] = gJob.shownAt[j + 1];
        memcpy(gJob.text[j], gJob.text[j + 1], sizeof(gJob.text[j]));
        memcpy(gJob.gxtKey[j], gJob.gxtKey[j + 1], sizeof(gJob.gxtKey[j]));
    }
    --gJob.count;
}

void Log(const wchar_t* text, const char* gxtKey, s32 face, double now)
{
    for (int i = 0; i < gJob.count; ++i)
    {
        if (!wcscmp(gJob.text[i], text))
        {
            Drop(i); // shown again: it moves to the end
            break;
        }
    }
    if (gJob.count == kMaxBriefs)
    {
        Drop(0);
    }
    wcsncpy(gJob.text[gJob.count], text, kBriefLen - 1);
    gJob.text[gJob.count][kBriefLen - 1] = 0;
    gJob.face[gJob.count] = face;
    gJob.shownAt[gJob.count] = now;
    strncpy(gJob.gxtKey[gJob.count], gxtKey, sizeof(gJob.gxtKey[gJob.count]) - 1);
    gJob.gxtKey[gJob.count][sizeof(gJob.gxtKey[gJob.count]) - 1] = 0;
    ++gJob.count;
}
} // namespace

void Gta2Port_TrackJobBriefs()
{
    if (!gGame_0x40_67E008 || !gHud_2B00_706620 || !gText_0x14_704DFC)
    {
        gJob.active = 0;
        return;
    }
    const double now = gta2_port_now_ms();
    const s32 onJob = gScriptManager_6F8060 && gScriptManager_6F8060->IsOnMission_4C7350() ? 1 : 0;
    if (onJob && !gJob.onJob)
    {
        for (int i = gJob.count - 1; i >= 0; --i)
        {
            if (now - gJob.shownAt[i] > kJobLeadMs)
            {
                Drop(i);
            }
        }
    }
    gJob.onJob = onJob;

    const Hud_BriefEntry_18* brief = gHud_2B00_706620->field_DC_brief.field_6F8_curr_briefs;
    if (!brief)
    {
        gJob.active = 0;
        gSeenKey[0] = 0;
        return;
    }
    gJob.active = 1;
    if (!strncmp(gSeenKey, brief->field_0_brief_id_str, sizeof(gSeenKey)) && gSeenParam == brief->field_14_cost_param)
    {
        return;
    }
    strncpy(gSeenKey, brief->field_0_brief_id_str, sizeof(gSeenKey));
    gSeenParam = brief->field_14_cost_param;

    // as Hud_Brief_704::FormatCurrentBrief_5D3470, without the line breaks
    static wchar_t text[1024]; // briefs are a few lines; the game formats them into tmpBuff_67BD9C
    const wchar_t* found = gText_0x14_704DFC->Find_5B5F90(brief->field_0_brief_id_str);
    if (!found)
    {
        return;
    }
    if (brief->field_14_cost_param != -1)
    {
        swprintf(text, found, brief->field_14_cost_param); // the port's swprintf is the MSVC form, as the game's
    }
    else
    {
        wcsncpy(text, found, 1023);
        text[1023] = 0;
    }
    const s32 face = GetBriefFaceIdx_5D3680(text[0]);
    Log(face ? text + 1 : text, brief->field_0_brief_id_str, face ? face : 8, now); // a face is "!z" etc. at the start
}

extern "C" EMSCRIPTEN_KEEPALIVE const JobBriefs* gta2_port_job_briefs()
{
    return &gJob;
}

extern "C" EMSCRIPTEN_KEEPALIVE void gta2_port_set_native_brief_text_hidden(int hidden)
{
    gNativeBriefTextHidden = hidden != 0;
}

extern "C" int gta2_port_native_brief_text_hidden()
{
    return gNativeBriefTextHidden ? 1 : 0;
}

extern "C" EMSCRIPTEN_KEEPALIVE void gta2_port_set_mission_title_key(int key)
{
    gMissionTitleKey = IsMissionTitleKey(key) ? key : 0;
    gMissionTitleLastSeenMs = gMissionTitleKey ? gta2_port_now_ms() : 0.0;
}

// The game also draws mission banners through generic HUD text, without going
// through SCRCMD_DISPLAY_MESSAGE. Identify exact title strings so the browser
// can replace the native glyph draw at the same moment.
extern "C" int gta2_port_try_mission_title_draw(const wchar_t* text)
{
    if (!gMissionTitleTextHidden || !text || !text[0])
        return 0;

    const size_t textLength = wcslen(text);
    if (textLength < 4 || textLength > 64 || !gText_0x14_704DFC)
        return 0;

    static int keys[88];
    static const wchar_t* sourceText[88];
    static size_t sourceLength[88];
    static bool initialized = false;
    if (!initialized)
    {
        int count = 0;
        const int ranges[][2] = { { 1952, 1953 }, { 1970, 1988 }, { 2460, 2470 },
                                  { 2671, 2674 }, { 2954, 2959 }, { 3840, 3861 } };
        for (const auto& range : ranges)
        {
            for (int key = range[0]; key <= range[1]; ++key)
            {
                char gxtKey[8];
                snprintf(gxtKey, sizeof(gxtKey), "%d", key);
                const wchar_t* title = gText_0x14_704DFC->Find_5B5F90(gxtKey);
                if (title)
                {
                    keys[count] = key;
                    sourceText[count] = title;
                    sourceLength[count] = wcslen(title);
                    ++count;
                }
            }
        }
        const int statusKeys[] = { 1016, 1017, 1018, 1124, 1125, 1338, 1339, 2998, 2999, 3100,
                                   3730, 3670, 3672, 3674, 6147, 6184, 6185, 6186 };
        for (const int key : statusKeys)
        {
            char gxtKey[8];
            snprintf(gxtKey, sizeof(gxtKey), "%d", key);
            const wchar_t* title = gText_0x14_704DFC->Find_5B5F90(gxtKey);
            if (title)
            {
                keys[count] = key;
                sourceText[count] = title;
                sourceLength[count] = wcslen(title);
                ++count;
            }
        }
        static const char* statusGxtKeys[] = { "mfail", "kfstart", "kfpass", "kffail" };
        for (int i = 0; i < 4; ++i)
        {
            const wchar_t* title = gText_0x14_704DFC->Find_5B5F90(statusGxtKeys[i]);
            if (title)
            {
                keys[count] = 9001 + i;
                sourceText[count] = title;
                sourceLength[count] = wcslen(title);
                ++count;
            }
        }
        initialized = true;
    }

    for (int i = 0; i < 88 && keys[i]; ++i)
    {
        if (sourceLength[i] == textLength && wcscmp(sourceText[i], text) == 0)
        {
            gMissionTitleKey = keys[i];
            gMissionTitleLastSeenMs = gta2_port_now_ms();
            return 1;
        }
    }
    return 0;
}

extern "C" EMSCRIPTEN_KEEPALIVE int gta2_port_mission_title_key()
{
    if (gMissionTitleKey && gta2_port_now_ms() - gMissionTitleLastSeenMs > 1800.0)
    {
        gMissionTitleKey = 0;
        gMissionTitleLastSeenMs = 0.0;
    }
    return gMissionTitleKey;
}

extern "C" EMSCRIPTEN_KEEPALIVE void gta2_port_set_native_mission_title_hidden(int hidden)
{
    gMissionTitleTextHidden = hidden != 0;
}

extern "C" int gta2_port_native_mission_title_text_hidden()
{
    return gMissionTitleTextHidden && gta2_port_mission_title_key() ? 1 : 0;
}

// Local QA hook: enqueue a real GXT brief so the game uses its own queue,
// portrait selection, timing and renderer. Call only when testing local data.
extern "C" EMSCRIPTEN_KEEPALIVE int gta2_dev_show_brief(const char* gxtKey)
{
    if (!gHud_2B00_706620 || !gText_0x14_704DFC || !gxtKey || !gxtKey[0] ||
        !gText_0x14_704DFC->Find_5B5F90(gxtKey))
    {
        return 0;
    }
    // Priority 2 preserves normal queue order when QA batches several keys.
    gHud_2B00_706620->field_DC_brief.SetHudBrief_5D4400(2, gxtKey);
    return 1;
}

extern "C" EMSCRIPTEN_KEEPALIVE int gta2_dev_show_mission_title(int key)
{
    if (!gHud_2B00_706620 || !gText_0x14_704DFC || !IsMissionTitleKey(key))
    {
        return 0;
    }
    char gxtKey[8];
    snprintf(gxtKey, sizeof(gxtKey), "%d", key);
    wchar_t* title = gText_0x14_704DFC->Find_5B5F90(gxtKey);
    if (!title)
    {
        return 0;
    }
    gta2_port_set_mission_title_key(key);
    gHud_2B00_706620->field_111C_message.ShowMessage_5D1A00(title, hud_message_priority::important_3);
    return 1;
}
