// ==UserScript==
// @name         Gemini Chat Markdown Exporter
// @namespace    http://tampermonkey.net/
// @version      4.4
// @description  Bypasses scroll limits, exports to clean native Markdown, and generates universal TOC (Obsidian/GitHub).
// @author       ZuccaAbusiva
// @match        https://gemini.google.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    function createExportButton() {
        if (document.getElementById('gemini-md-exporter-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'gemini-md-exporter-btn';
        btn.innerText = '📥 Export .md';
        Object.assign(btn.style, {
            position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
            padding: '12px 18px', backgroundColor: '#1d358a', color: '#ffffff',
            border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease'
        });

        btn.onmouseover = () => btn.style.backgroundColor = '#1558c0';
        btn.onmouseout = () => btn.style.backgroundColor = '#1a73e8';
        btn.onclick = startExportProcess;

        document.body.appendChild(btn);
    }

    async function forceScrollToTop(btn) {
        let lastCount = 0;
        let noChangeCount = 0;
        const MAX_RETRIES = 6;

        while (noChangeCount < MAX_RETRIES) {
            const candidates = [
                document.querySelector('infinite-scroller'),
                document.querySelector('.conversation-container'),
                document.querySelector('[data-test-id="chat-history-container"]'),
                document.querySelector('main')
            ];

            let validContainers = candidates.filter(el => el && el.scrollHeight > el.clientHeight);
            if (validContainers.length === 0) validContainers = [window];

            validContainers.forEach(c => {
                if (c === window) window.scrollTo(0, 0);
                else c.scrollTop = 0;
            });

            btn.innerText = `⏳ Fetching older messages... (${noChangeCount + 1}/${MAX_RETRIES})`;
            await new Promise(resolve => setTimeout(resolve, 1500));

            const currentCount = document.querySelectorAll('user-query, model-response').length;

            if (currentCount > lastCount) {
                lastCount = currentCount;
                noChangeCount = 0;
                btn.innerText = `✅ Loaded ${currentCount} messages. Scrolling higher...`;
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                noChangeCount++;
            }
        }
    }

    // Estrazione pulita del testo dell'utente per evitare duplicati da nodi accessibili/nascosti
    function getUserQueryText(turn) {
        const clone = turn.cloneNode(true);

        // Rimuove bottoni di modifica, elementi per screen reader o elementi nascosti
        const junk = clone.querySelectorAll(
            'button, .cdk-visually-hidden, [aria-hidden="true"], mat-icon, .edit-button'
        );
        junk.forEach(el => el.remove());

        // Cerca il blocco di testo primario
        const specificEl = clone.querySelector('.query-text, .text-content, p') || clone.querySelector('.query-content') || clone;

        let text = specificEl.innerText || specificEl.textContent || '';

        return text
            .replace(/^(Hai detto|You said|Dijiste|Vous avez dit|Du hast gesagt|Você disse)\s*/i, '')
            .trim();
    }

    async function startExportProcess() {
        const btn = document.getElementById('gemini-md-exporter-btn');
        const originalText = btn.innerText;

        try {
            btn.style.backgroundColor = '#ff9800';
            await forceScrollToTop(btn);

            btn.innerText = '⚙️ Generating Markdown...';

            const turns = document.querySelectorAll('user-query, model-response');
            if (turns.length === 0) throw new Error("No messages found in the DOM.");

            let tocEntries = [];
            let conversationBlocks = [];
            let turnCounter = 1;

            for (let i = 0; i < turns.length; i++) {
                const turn = turns[i];
                const isUser = turn.tagName.toLowerCase() === 'user-query';

                if (isUser) {
                    let userText = getUserQueryText(turn);

                    // Evita stringhe vuote
                    if (!userText) continue;

                    // Anteprima per TOC
                    let words = userText.split(/\s+/).filter(Boolean);
                    let shortPrompt = words.slice(0, 20).join(' ');
                    if (words.length > 20) shortPrompt += '...';

                    const anchorId = `q${turnCounter}`;
                    tocEntries.push(`${turnCounter}. [${shortPrompt}](#${anchorId})`);

                    let formattedPrompt = userText.split('\n').map(line => `> ${line}`).join('\n');
                    let userBlock = `# Q${turnCounter}\n\n##### You:\n\n${formattedPrompt}\n\n---`;

                    conversationBlocks.push(userBlock);
                    turnCounter++;
                } else {
                    const responseDiv = turn.querySelector('message-content, .model-response-text, .markdown') || turn;
                    let geminiContent = convertToMarkdown(responseDiv).replace(/\n{3,}/g, '\n\n').trim();

                    let geminiBlock = `##### Gemini:\n\n${geminiContent}\n\n---`;
                    conversationBlocks.push(geminiBlock);
                }
            }

            let markdown = `# Gemini Conversation\n\n*Exported on: ${new Date().toLocaleString()}*\n\n---\n\n`;
            markdown += `## Table of Contents\n\n${tocEntries.join('\n')}\n\n---\n\n`;
            markdown += conversationBlocks.join('\n\n') + `\n`;

            downloadFile(markdown);

        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally {
            btn.style.backgroundColor = '#1a73e8';
            btn.innerText = originalText;
        }
    }

    function convertToMarkdown(node) {
        if (!node) return '';
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName.toLowerCase();
        let cls = typeof node.className === 'string' ? node.className : (node.classList ? Array.from(node.classList).join(' ') : '');

        if (tag === 'button' || tag === 'svg' || tag === 'script' || tag === 'style' ||
            cls.includes('action-container') || cls.includes('copy-button') ||
            cls.includes('code-block-decoration') || cls.includes('draft-container') ||
            cls.includes('hidden')) {
            return '';
        }

        if (tag === 'pre' || cls.includes('code-block')) {
            const codeNode = node.querySelector('code');
            const code = codeNode ? codeNode.textContent : node.textContent;
            return `\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`;
        }

        if (tag === 'table') {
            const rows = Array.from(node.querySelectorAll('tr'));
            if (rows.length === 0) return '';
            let md = '\n';
            rows.forEach((row, index) => {
                const cols = Array.from(row.querySelectorAll('td, th'));
                let rowMd = cols.map(c => {
                    let cellContent = '';
                    c.childNodes.forEach(child => { cellContent += convertToMarkdown(child); });
                    return cellContent.replace(/\n+/g, ' ').trim();
                }).join(' | ');

                md += `| ${rowMd} |\n`;
                if (index === 0) md += `| ${cols.map(() => '---').join(' | ')} |\n`;
            });
            return md + '\n';
        }

        if (['tr', 'td', 'th', 'tbody', 'thead'].includes(tag)) return '';

        let childMd = '';
        if (node.childNodes && node.childNodes.length > 0) {
            node.childNodes.forEach(child => { childMd += convertToMarkdown(child); });
        } else {
            childMd = node.textContent || '';
        }

        if (tag === 'h1') return `\n# ${childMd.trim()}\n\n`;
        if (tag === 'h2') return `\n## ${childMd.trim()}\n\n`;
        if (tag === 'h3') return `\n### ${childMd.trim()}\n\n`;
        if (tag === 'h4') return `\n#### ${childMd.trim()}\n\n`;
        if (tag === 'p' || tag === 'div') return `\n${childMd.trim()}\n\n`;
        if (tag === 'strong' || tag === 'b') return `**${childMd.trim()}**`;
        if (tag === 'em' || tag === 'i') return `*${childMd.trim()}*`;
        if (tag === 'code') return `\`${childMd.trim()}\``;
        if (tag === 'li') return `- ${childMd.trim()}\n`;
        if (tag === 'ul' || tag === 'ol') return `\n${childMd}\n`;
        if (tag === 'blockquote') return `\n> ${childMd.trim().replace(/\n/g, '\n> ')}\n\n`;
        if (tag === 'a' && node.href) return `[${childMd.trim()}](${node.href})`;

        return childMd;
    }

    // Clean file name generator (Titolo completo)
    function getCleanFileName() {
        let title = '';

        const sidebarTitle = document.querySelector(
            'conversation-observer .selected, ' +
            '[data-test-id="conversation-title-text"], ' +
            'mat-list-item.selected, ' +
            'a[aria-selected="true"]'
        );
        const headerTitle = document.querySelector('header h1, .conversation-title');

        if (sidebarTitle && sidebarTitle.textContent.trim()) {
            title = sidebarTitle.textContent;
        } else if (headerTitle && headerTitle.textContent.trim()) {
            title = headerTitle.textContent;
        } else {
            title = document.title || '';
            if (title.includes(' - Gemini')) {
                title = title.split(' - Gemini')[0];
            }
            if (title.includes('Gemini')) {
                title = title.replace('Gemini', '');
            }
        }

        // Rimuove caratteri vietati nei filesystem (\ / : * ? " < > |) e normalizza gli spazi
        let cleaned = title
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleaned || cleaned.toLowerCase() === 'chat' || cleaned.toLowerCase() === 'new chat') {
            return 'Gemini Chat';
        }

        // Mantiene il titolo intero (con un tetto massimo di sicurezza per i vincoli di OS)
        return cleaned.length > 120 ? cleaned.slice(0, 120).trim() : cleaned;
    }

    function downloadFile(content) {
        const namePart = getCleanFileName();
        const datePart = new Date().toISOString().slice(0, 10);
        const filename = `${namePart} - ${datePart}.md`;

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const observer = new MutationObserver(() => {
        if (document.body) createExportButton();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
