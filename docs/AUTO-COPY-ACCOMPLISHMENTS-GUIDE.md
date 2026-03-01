# Auto-Copy Accomplishments — Feature Guide

> **Version:** 2.0 (with enhanced auto-removal & reliability fixes)
> **Last Updated:** June 2025

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Managing Accomplishments](#managing-accomplishments)
5. [What's New in v2.0](#whats-new-in-v20)
6. [FAQ](#faq)
7. [Tips & Best Practices](#tips--best-practices)

---

## Overview

The **Auto-Copy Accomplishments** feature automatically detects when milestones or tasks reach **100% completion** and offers to add them to your project's **Accomplishments** section — saving you from manually typing the same information twice.

It also works in reverse: if you change a milestone or task **back below 100%**, the corresponding auto-generated accomplishment is **automatically removed** — keeping your status sheet accurate without any manual cleanup.

### Key Benefits

- ✅ **Save time** — No need to re-type completed milestones/tasks as accomplishments
- ✅ **Stay accurate** — Accomplishments stay in sync with your actual completion data
- ✅ **Stay in control** — You choose which items get added, and you can edit or hide them at any time
- ✅ **Automatic cleanup** — Un-completing an item removes its accomplishment silently

---

## How It Works

### Auto-Add (Completion → 100%)

When you update a milestone or task completion to **100%** and click **Save**, the system:

1. **Detects** which milestones/tasks just transitioned to 100% (were previously below 100%)
2. **Shows a confirmation dialog** listing all newly completed items
3. **Lets you select** which items to add as accomplishments
4. **Adds them** to the Accomplishments section with an ✨ auto-generated badge
5. **Saves** the project automatically

### Auto-Remove (Completion drops below 100%)

When you change a milestone or task completion **from 100% back to a lower value** and click **Save**, the system:

1. **Detects** the un-completion automatically
2. **Finds** the matching auto-generated accomplishment (using smart matching)
3. **Soft-deletes** the accomplishment silently (no dialog needed)
4. **Saves** the project automatically

> **Note:** Only auto-generated accomplishments are affected by auto-removal. Manually entered accomplishments are never touched.

---

## Step-by-Step Guide

### Adding Accomplishments Automatically

1. **Open your project** and navigate to the project form
2. **Update a milestone or task** completion to **100%**
3. **Click Save** (or the save will be triggered)
4. A **dialog appears** showing the newly completed items:

   ![Dialog Example](# "Auto-Copy Accomplishments Dialog")

   - **Milestones** are listed under a 🏁 Milestones header
   - **Tasks** are listed under a ✅ Tasks header, with their parent milestone name shown in parentheses
   - Each item shows a preview of how it will appear in the Accomplishments section

5. **Select or deselect** items using the checkboxes:
   - Use the **"Select All"** checkbox at the top for convenience
   - Uncheck any items you don't want as accomplishments

6. **Click "Add as Accomplishment(s)"** to confirm, or **"Skip"** to save without adding

7. The selected items appear in the **Accomplishments section** with a ✨ sparkle icon indicating they were auto-generated

### What Happens When You Un-Complete an Item

1. **Change a milestone or task** from 100% back to a lower percentage (e.g., 80%)
2. **Click Save**
3. The system **automatically finds and removes** the corresponding auto-generated accomplishment
4. No dialog or confirmation is shown — the cleanup happens silently
5. The project saves normally

---

## Managing Accomplishments

### Accomplishment States

Each accomplishment can be in one of three states:

| State | Appearance | Description |
|-------|-----------|-------------|
| **Visible** | Normal text with input field | Shows on the status sheet and in reports |
| **Hidden** | Dimmed with 👁️‍🗨️ eye-off icon | Kept in the system but hidden from the status sheet |
| **Deleted** | Struck-through, fully dimmed | Soft-deleted; can be undone or permanently removed |

### Identifying Auto-Generated Accomplishments

Auto-generated accomplishments are marked with a **✨ sparkle icon** next to them. Hover over the icon to see whether it was generated from a completed **milestone** or **task**.

### Actions on Accomplishments

| Action | Icon | Description |
|--------|------|-------------|
| **Edit** | — | Click the text field and type to modify the description |
| **Hide** | 👁️‍🗨️ (Eye Off) | Hides from status sheet; appears on hover. Useful for items you want to keep but not display |
| **Unhide** | 👁️ (Eye) | Makes a hidden item visible on the status sheet again |
| **Delete** | 🗑️ (Trash) | Soft-deletes the item. Can be undone |
| **Undo Delete** | ↩️ (Undo) | Restores a soft-deleted item (returns it to "Hidden" state) |
| **Permanent Delete** | 🗑️ (Trash, on hidden item) | Permanently removes the item from the project |

### Hidden & Deleted Section

Hidden and deleted items are grouped in a collapsible section at the bottom of the Accomplishments area:

- Click the **chevron** (▸ / ▾) to expand or collapse this section
- The count badge shows how many items are hidden or deleted
- Hidden items can be made visible again
- Deleted items can be restored or permanently removed

---

## What's New in v2.0

### 🔧 Enhanced Reliability

Two critical bugs have been fixed that could cause auto-generated accomplishments to "stick around" even after un-completing an item:

#### Fix 1: Reliable Auto-Removal Saves

**Before:** When un-completing an item, the system would mark the accomplishment as deleted and immediately try to save. Due to React's asynchronous state updates, the save could happen before the deletion was applied — meaning the accomplishment was never actually removed.

**After:** The system now uses a **deferred save pattern**. It marks the accomplishment for deletion, waits for the UI to update, and then triggers the save on the next render cycle. This ensures the deletion is always persisted.

#### Fix 2: Smart Multi-Strategy Matching

**Before:** The system matched accomplishments to their source items using only the database ID (`source_id`). However, when a project is saved, tasks and milestones are deleted and re-inserted with **new IDs**. This meant the system couldn't find the matching accomplishment when you un-completed an item after a save.

**After:** The system now uses **three matching strategies** in sequence:

1. **Direct ID Match** — Checks the `source_id` directly (works when IDs haven't changed)
2. **Composite Key Match** — Uses a stable key based on the item's description and parent (`task:description:milestoneName`), which survives ID changes
3. **Description Match** — Compares the accomplishment text against the original item description as a final fallback

This ensures auto-removal works reliably regardless of when items were saved or how many times IDs have changed.

---

## FAQ

### Q: Will this feature edit my manually-typed accomplishments?
**A:** No. Auto-removal only affects accomplishments that were **auto-generated** (marked with the ✨ sparkle icon). Manually typed accomplishments are never modified or deleted by the system.

### Q: What if I edit an auto-generated accomplishment's text?
**A:** The auto-removal will still try to find it using the multi-strategy matching (ID, composite key, and description). If you've significantly changed the text, the system may not match it, which means it won't be auto-removed — and that's fine! You can manually delete it.

### Q: Can I add accomplishments without using the auto-copy feature?
**A:** Absolutely. Click the **"+ Add"** button in the Accomplishments section to add a blank row and type your own accomplishment.

### Q: What if I click "Skip" on the auto-copy dialog?
**A:** The project saves normally without adding any accomplishments. The completed items remain at 100%, and you can always add accomplishments manually later.

### Q: What happens if I complete multiple milestones/tasks at once?
**A:** The dialog will show **all** newly completed items together. You can select which ones to add using the checkboxes.

### Q: Does hiding an accomplishment affect anything else?
**A:** Hidden accomplishments are excluded from the **status sheet** and **reports**, but they remain in the system. They do **not** affect milestone or task completion percentages.

### Q: What if I undo a deleted auto-generated accomplishment?
**A:** The accomplishment is restored to **"Hidden"** state. You can then click the eye icon to make it visible on the status sheet again.

---

## Tips & Best Practices

1. **Let the system do the work** — Update your milestones/tasks to 100% and let auto-copy handle the accomplishment entries. This reduces duplication.

2. **Use "Hide" instead of "Delete"** — If an accomplishment is valid but you don't want it on the current status sheet, hide it instead of deleting it. You can always unhide it later.

3. **Edit auto-generated text** — The generated descriptions are based on milestone/task names. Feel free to edit them to be more descriptive or audience-appropriate.

4. **Review before saving** — When the auto-copy dialog appears, take a moment to review which items make sense as accomplishments. Not every 100% task needs to be highlighted.

5. **Trust the auto-removal** — When you adjust a milestone/task below 100%, the system handles cleanup automatically. No action needed on your part.

---

*For technical details or troubleshooting, see the [API Reference](./API-REFERENCE.md) or contact your system administrator.*
