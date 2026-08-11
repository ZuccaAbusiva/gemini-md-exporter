# gemini-md-exporter
A powerful, privacy-first Userscript that exports your entire Google Gemini chat history into clean, beautifully structured **Native Markdown** with a universal **Table of Contents (TOC)** compatible with Obsidian, GitHub, Logseq, Marktext, Logseq & more.

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

- **🔄 Unstoppable Deep Auto-Scroll (Bypass Lazy-Loading):** Google Gemini lazily loads long chat histories as you scroll up. This script automatically scrolls through multiple DOM container candidates until **all historical turns** are fully loaded before exporting.
- **🗺️ Universal Table of Contents (TOC):** Generates clean anchor links (`#q1`, `#q2`, ...) and 20-word prompt summaries. Works seamlessly in **Obsidian**, **GitHub Gists**, **VS Code**, and standard Markdown viewers. Uses H1 titles for every new question so the resulting .md is easilly collapsable in Obsidian.
- **🧹 Clean Multilingual Parsing:** Strips UI junk, copy buttons, draft containers, and system prefixes (e.g., *"You said"*, *"Hai detto"*, *"Vous avez dit"*, *"Du hast gesagt"*).
- **📊 Native Table & Code Block Support:** Converts HTML tables into standard GFM Markdown tables and preserves code block formatting effortlessly.
- **🔒 100% Private & Local:** Runs entirely inside your browser. No external servers, no tracking, no third-party libraries required.
- **🏷️ Smart Auto-Naming:** Dynamically extracts the chat's actual title and appends the export date (`Chat Title - YYYY-MM-DD.md`).

---

## 💾 Installation

1. Install a Userscript Manager extension in your browser:
   - [Tampermonkey](https://www.tampermonkey.net/) (Recommended for Chrome/Brave/Edge/Firefox)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. **Add the Script:**
   - Click on the Userscript Manager icon in your browser menu.
   - Select **Create a new script...**
   - Copy and paste the entire content of [`gemini-exporter.user.js`](./gemini-chat-exporter.user.js) into the editor.
   - Save the script (`Ctrl + S` or `Cmd + S`).
  
You can also install it directly from [GreasyFork](https://greasyfork.org/it/scripts/590845-gemini-chat-exporter-ultimate-dom-autoscroll)

---

## 🚀 How to Use

1. Open any chat on [Google Gemini](https://gemini.google.com/).
2. Look for the floating **`📥 Export All (MD)`** button at the bottom right corner of the page.
3. Click the button.
4. Sit back! The script will:
   - Automatically scroll up to load the full message history.
   - Parse all user queries and Gemini responses.
   - Convert the conversation into structured Markdown with a TOC.
   - Trigger a download of the `.md` file.

---

## 📝 Markdown Preview Structure


📄 **[View Full Export Example (Example_Output.md)](Example_Output.md)**

```markdown
# Gemini Conversation

*Exported on: 2026-08-11, 11:50:00*

---

## Table of Contents

1. [Explain quantum computing in simple terms...](#q1)
2. [Can you provide a Python script to parse JSON...](#q2)

---

# Q1

##### You:

> Explain quantum computing in simple terms

---

##### Gemini:

Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics...

---
```

## Lacking features (I may add them in the future)
- Bulk export of all chats
- Image incorporation
