# gemini full chat markdown exporter userscript
A powerful, privacy-first Userscript that exports your Google Gemini chats into clean, beautifully structured **Native Markdown** with offline-embedded images and a universal **Table of Contents (TOC)** compatible with Obsidian, GitHub, Logseq, VS Code, Marktext & more.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Tampermonkey%20%7C%20Violentmonkey-green.svg)
![Privacy](https://img.shields.io/badge/privacy-100%25%20Local-success.svg)

---
<table>
  <tr>
    <td width="50%">
      <img src="https://github.com/user-attachments/assets/825434ac-db97-4169-90c1-19d6b3a4d24a" alt="Screen 1" style="width:100%;">
    </td>
    <td width="50%">
      <img src="https://github.com/user-attachments/assets/ab39f25d-edf0-4f83-9dd2-8a8987490a2c" alt="Screen 2" style="width:100%;">
    </td>
  </tr>
</table>

## ✨ Features & Key Advantages

Why choose **Gemini Chat Exporter** over standard extensions or copy-pasting?

- **🎯 Unified Action Button:** A single, non-intrusive floating button that lets you choose whether to download the active conversation or run an automated batch export of your entire history.
- **📚 Batch Export with Live Interrupt:** Automatically scans and expands your sidebar, navigates across all your chats sequentially, and exports each one to its own `.md` file. Need to pause or stop? Simply click the red **`🛑 Stop Batch`** button at any time.
- **🖼️ 100% Offline Embedded Images:** Converts AI-generated visuals (including Imagen creations and `blob:` sources) into local Base64 URI strings (`data:image/...`). Your Markdown files remain completely self-contained and render perfectly offline without broken links.
- **🔄 Unstoppable Deep Auto-Scroll (Bypass Lazy-Loading):** Automatically scrolls through multiple DOM container candidates until **all historical turns** are fully loaded before generating the file.
- **🗺️ Universal Table of Contents (TOC):** Generates clean anchor links (`#q1`, `#q2`, ...) and 20-word prompt summaries. Uses `# Q1` header levels for every prompt so sections collapse cleanly in Obsidian and VS Code.
- **🧹 Clean Multilingual Parsing:** Strips UI noise, copy buttons, draft containers, and system prefixes (e.g., *"You said"*, *"Hai detto"*, *"Vous avez dit"*, *"Du hast gesagt"*).
- **📊 Native Table & Code Block Support:** Converts Gemini HTML tables into standard GFM Markdown tables and preserves syntax-highlighted code blocks.
- **🔒 100% Private & Local:** Runs entirely inside your browser sandbox. No external telemetry, no remote proxies, and no third-party servers.
- **🏷️ Smart Auto-Naming:** Dynamically extracts each chat's actual title and appends the export date (`Chat Title - YYYY-MM-DD.md`).

---

## 💾 Installation

1. Install a Userscript Manager extension in your browser:
   - [Tampermonkey](https://www.tampermonkey.net/) (Recommended for Chrome/Brave/Edge/Firefox)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. **Add the Script:**
   - Click on the Userscript Manager icon in your browser toolbar.
   - Select **Create a new script...**
   - Copy and paste the entire content of [`gemini-exporter.user.js`](./gemini-chat-exporter.user.js) into the editor.
   - Save the script (`Ctrl + S` or `Cmd + S`).
   
You can also install it directly from [GreasyFork](https://greasyfork.org/it/scripts/590845-gemini-chat-exporter-ultimate-dom-autoscroll)

---

## 🚀 How to Use

1. Open [Google Gemini](https://gemini.google.com/).
2. Click the floating **`📥 Export .md`** button at the bottom-right corner of the page.
3. Choose your mode in the prompt dialog:
   - **Click OK:** Exports **ONLY** the current active chat.
   - **Click CANCEL:** Starts the **Batch Export** sequence to save all chats in your sidebar.
4. During a batch run, the button turns red (**`🛑 Stop Batch`**). Click it at any moment to safely cancel remaining downloads.

---

## 📝 Markdown Preview Structure

📄 **[View Full Export Example (Example_Output.md)](Example_Output.md)**

```markdown
# Gemini Conversation

*Exported on: 2026-08-11, 11:50:00*

---

## Table of Contents

1. [Explain quantum computing in simple terms...](#q1)
2. [Can you generate a landscape concept artwork...](#q2)

---

# Q1

##### You:

> Explain quantum computing in simple terms

---

##### Gemini:

Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics...

---

# Q2

##### You:

> Can you generate a landscape concept artwork of a futuristic city?

---

##### Gemini:

Here is the concept render based on your description:

![Futuristic City](data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...)
*A futuristic city at dusk, AI generated*

---
