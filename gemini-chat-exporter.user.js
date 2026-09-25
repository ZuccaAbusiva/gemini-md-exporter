// ==UserScript==
// @name         Gemini Chat Exporter (Unified + Base64 Embedded Images)
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Export current or ALL Gemini chats sequentially to native clean Markdown with embedded base64 images and abort controls.
// @author       ZuccaAbusiva
// @match        https://gemini.google.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    let isBatchRunning = false;
    let shouldAbort = false;

    // --- UI INJECTION ---
    function createExportButton() {
        if (document.getElementById('gemini-md-exporter-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'gemini-md-exporter-btn';
        btn.innerText = '📥 Export .md';

        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '999999',
            padding: '10px 18px',
            backgroundColor: '#1d358a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
        });

        btn.onmouseover = () => btn.style.filter = 'brightness(1.15)';
        btn.onmouseout = () => btn.style.filter = 'none';

        btn.onclick = handleButtonClick;
        document.body.appendChild(btn);
    }

    function updateButtonUI(text, bgColor) {
        const btn = document.getElementById('gemini-md-exporter-btn');
        if (!btn) return;
        if (text) btn.innerText = text;
        if (bgColor) btn.style.backgroundColor = bgColor;
    }

    async function handleButtonClick() {
        if (isBatchRunning) {
            shouldAbort = true;
            updateButtonUI('🛑 Stopping...', '#b71c1c');
            return;
        }

        const choice = confirm(
            "Select export mode:\n\n" +
            "• Click OK to export ONLY the CURRENT chat\n" +
            "• Click CANCEL to export ALL chats (Batch Export)"
        );

        if (choice) {
            await startExportProcess(false);
        } else {
            await startBatchExport();
        }
    }

    // --- IMAGE TO BASE64 HELPER (GENERATED / INLINE IMAGES) ---
    async function toDataURL(url) {
        if (!url) return '';
        if (url.startsWith('data:image')) return url;

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth || img.width;
                        canvas.height = img.naturalHeight || img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    } catch (err) {
                        resolve(url);
                    }
                };
                img.onerror = () => resolve(url);
                img.src = url;
            });
        }
    }

    // --- SCROLL FOR CHAT HISTORY RETRIEVAL ---
    async function forceScrollToTop(statusCallback) {
        let lastCount = 0;
        let noChangeCount = 0;
        const MAX_RETRIES = 6;

        while (noChangeCount < MAX_RETRIES) {
            if (shouldAbort) break;

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

            if (statusCallback) statusCallback(`Loading messages... (${noChangeCount + 1}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, 1000));

            const currentCount = document.querySelectorAll('user-query, model-response').length;

            if (currentCount > lastCount) {
                lastCount = currentCount;
                noChangeCount = 0;
                await new Promise(r => setTimeout(r, 600));
            } else {
                noChangeCount++;
            }
        }
    }

    // --- EXTRACT USER QUERY TEXT ONLY ---
    function getUserQueryContent(turn) {
        const clone = turn.cloneNode(true);
        const junk = clone.querySelectorAll('button, .cdk-visually-hidden, [aria-hidden="true"], mat-icon, .edit-button, img');
        junk.forEach(el => el.remove());

        const specificEl = clone.querySelector('.query-text, .text-content, p') || clone.querySelector('.query-content') || clone;
        let text = (specificEl.innerText || specificEl.textContent || '')
            .replace(/^(Hai detto|You said|Dijiste|Vous avez dit|Du hast gesagt|Você disse)\s*/i, '')
            .trim();

        let formattedPrompt = '';
        if (text) {
            formattedPrompt = text.split('\n').map(line => `> ${line}`).join('\n');
        }

        return {
            fullMarkdown: formattedPrompt,
            rawText: text
        };
    }

    // --- CONVERT GEMINI RESPONSE TO MARKDOWN WITH BASE64 IMAGES ---
    async function convertToMarkdownAsync(node) {
        if (!node) return '';
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName.toLowerCase();
        let cls = typeof node.className === 'string' ? node.className : (node.classList ? Array.from(node.classList).join(' ') : '');

        // 1. Overlay container for generated and inline images
        if (cls.includes('overlay-container') || cls.includes('hero-overlay-container')) {
            const img = node.querySelector('img');
            const captionEl = node.querySelector('.caption, .hero-caption');
            if (img && img.src) {
                const alt = img.alt || (captionEl ? captionEl.textContent.trim() : 'Generated image');
                const captionText = captionEl ? `\n*${captionEl.textContent.trim()}*` : '';
                const base64Data = await toDataURL(img.src);
                return `\n\n![${alt}](${base64Data})${captionText}\n\n`;
            }
        }

        // 2. Direct generated images (blob URLs or standard image tags)
        if (tag === 'img') {
            const src = node.getAttribute('src');
            if (src) {
                const alt = node.getAttribute('alt') || 'Image';
                const base64Data = await toDataURL(src);
                return `\n\n![${alt}](${base64Data})\n\n`;
            }
            return '';
        }

        // Filter UI elements
        if ((tag === 'button' && !node.querySelector('img')) || tag === 'svg' || tag === 'script' || tag === 'style' ||
            cls.includes('action-container') || cls.includes('copy-button') ||
            cls.includes('code-block-decoration') || cls.includes('draft-container') ||
            cls.includes('hidden')) {
            return '';
        }

        // Code blocks
        if (tag === 'pre' || cls.includes('code-block')) {
            const codeNode = node.querySelector('code');
            const code = codeNode ? codeNode.textContent : node.textContent;
            return `\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`;
        }

        // Tables
        if (tag === 'table') {
            const rows = Array.from(node.querySelectorAll('tr'));
            if (rows.length === 0) return '';
            let md = '\n';
            for (let index = 0; index < rows.length; index++) {
                const row = rows[index];
                const cols = Array.from(row.querySelectorAll('td, th'));
                let rowParts = [];
                for (const c of cols) {
                    let cellContent = '';
                    for (const child of c.childNodes) {
                        cellContent += await convertToMarkdownAsync(child);
                    }
                    rowParts.push(cellContent.replace(/\n+/g, ' ').trim());
                }
                md += `| ${rowParts.join(' | ')} |\n`;
                if (index === 0) md += `| ${cols.map(() => '---').join(' | ')} |\n`;
            }
            return md + '\n';
        }

        if (['tr', 'td', 'th', 'tbody', 'thead'].includes(tag)) return '';

        let childMd = '';
        if (node.childNodes && node.childNodes.length > 0) {
            for (const child of node.childNodes) {
                childMd += await convertToMarkdownAsync(child);
            }
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

    function getCleanFileName(explicitTitle = '') {
        let title = explicitTitle;

        if (!title) {
            const sidebarTitle = document.querySelector(
                'conversation-observer .selected, ' +
                '[data-test-id="conversation-title-text"], ' +
                'mat-list-item.selected, ' +
                'a[aria-selected="true"]'
            );
            const headerTitle = document.querySelector('header h1, .conversation-title');

            if (sidebarTitle && sidebarTitle.textContent.trim()) title = sidebarTitle.textContent;
            else if (headerTitle && headerTitle.textContent.trim()) title = headerTitle.textContent;
            else {
                title = document.title || '';
                if (title.includes(' - Gemini')) title = title.split(' - Gemini')[0];
                if (title.includes('Gemini')) title = title.replace('Gemini', '');
            }
        }

        let cleaned = title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
        if (!cleaned || cleaned.toLowerCase() === 'chat' || cleaned.toLowerCase() === 'new chat') {
            return 'Gemini Chat';
        }
        return cleaned.length > 120 ? cleaned.slice(0, 120).trim() : cleaned;
    }

    function downloadFile(content, explicitTitle = '') {
        const namePart = getCleanFileName(explicitTitle);
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

    // --- SINGLE CHAT EXPORT PIPELINE ---
    async function startExportProcess(isBatch = false, explicitTitle = '') {
        try {
            await forceScrollToTop((status) => {
                if (!isBatch) updateButtonUI(status, '#1d358a');
            });

            if (shouldAbort) return false;

            const turns = document.querySelectorAll('user-query, model-response');
            if (turns.length === 0) return false;

            let tocEntries = [];
            let conversationBlocks = [];
            let turnCounter = 1;

            for (let i = 0; i < turns.length; i++) {
                if (shouldAbort) return false;

                const turn = turns[i];
                const isUser = turn.tagName.toLowerCase() === 'user-query';

                if (isUser) {
                    if (!isBatch) updateButtonUI(`Processing prompt ${turnCounter}...`, '#1d358a');
                    const parsed = getUserQueryContent(turn);
                    if (!parsed.rawText && !parsed.fullMarkdown) continue;

                    let words = parsed.rawText.split(/\s+/).filter(Boolean);
                    let shortPrompt = words.slice(0, 20).join(' ');
                    if (words.length > 20) shortPrompt += '...';

                    const anchorId = `q${turnCounter}`;
                    tocEntries.push(`${turnCounter}. [${shortPrompt}](#${anchorId})`);
                    conversationBlocks.push(`# Q${turnCounter}\n\n##### You:\n\n${parsed.fullMarkdown}\n\n---`);
                    turnCounter++;
                } else {
                    if (!isBatch) updateButtonUI(`Processing response ${turnCounter - 1}...`, '#1d358a');
                    const responseDiv = turn.querySelector('message-content, .model-response-text, .markdown') || turn;
                    let geminiContent = (await convertToMarkdownAsync(responseDiv)).replace(/\n{3,}/g, '\n\n').trim();
                    conversationBlocks.push(`##### Gemini:\n\n${geminiContent}\n\n---`);
                }
            }

            let markdown = `# Gemini Conversation\n\n*Exported on: ${new Date().toLocaleString()}*\n\n---\n\n`;
            markdown += `## Table of Contents\n\n${tocEntries.join('\n')}\n\n---\n\n`;
            markdown += conversationBlocks.join('\n\n') + `\n`;

            downloadFile(markdown, explicitTitle);
            return true;
        } catch (err) {
            console.error(err);
            if (!isBatch) alert(`Error: ${err.message}`);
            return false;
        } finally {
            if (!isBatch) {
                updateButtonUI('📥 Export .md', '#1d358a');
            }
        }
    }

    // --- EXPAND ENTIRE SIDEBAR ---
    async function fullyExpandSidebar() {
        const container = document.querySelector('conversations-list')?.closest('.chat-history, .expandable-section-content-inner')
            || document.querySelector('.chat-history')
            || document.querySelector('mat-nav-list')?.parentElement;

        if (!container) return;

        let lastCount = 0;
        let stableTries = 0;

        while (stableTries < 4) {
            if (shouldAbort) break;

            container.scrollTop = container.scrollHeight;
            await new Promise(r => setTimeout(r, 1200));

            const count = document.querySelectorAll('conversations-list a[href^="/app/"]').length;
            updateButtonUI(`🛑 Stop (${count} chats found)`, '#d32f2f');

            if (count > lastCount) {
                lastCount = count;
                stableTries = 0;
            } else {
                stableTries++;
            }
        }
    }

    // --- SEQUENTIAL BATCH RUNNER ---
    async function startBatchExport() {
        isBatchRunning = true;
        shouldAbort = false;
        updateButtonUI('🛑 Stop Batch', '#d32f2f');

        try {
            await fullyExpandSidebar();

            if (shouldAbort) throw new Error('Operation cancelled by user.');

            const linkElements = Array.from(document.querySelectorAll('conversations-list a[href^="/app/"]'));
            const chats = [];
            const seenIds = new Set();

            linkElements.forEach(a => {
                const href = a.getAttribute('href');
                const idMatch = href.match(/\/app\/([a-z0-9]+)/i);
                if (idMatch && !seenIds.has(idMatch[1])) {
                    seenIds.add(idMatch[1]);
                    const titleText = a.getAttribute('aria-label')
                        || a.querySelector('.title-text')?.textContent?.trim()
                        || idMatch[1];
                    chats.push({ id: idMatch[1], href, title: titleText });
                }
            });

            if (chats.length === 0) {
                alert('No chats detected in sidebar.');
                return;
            }

            for (let i = 0; i < chats.length; i++) {
                if (shouldAbort) {
                    alert('Batch export stopped.');
                    break;
                }

                const chat = chats[i];
                updateButtonUI(`🛑 Stop [${i + 1}/${chats.length}]`, '#d32f2f');

                const targetLink = document.querySelector(`a[href*="${chat.id}"]`);
                if (targetLink) {
                    targetLink.click();
                } else {
                    window.location.hash = '';
                    window.history.pushState(null, '', chat.href);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }

                let loaded = false;
                for (let retry = 0; retry < 15; retry++) {
                    if (shouldAbort) break;
                    await new Promise(r => setTimeout(r, 600));
                    const messages = document.querySelectorAll('user-query, model-response');
                    if (messages.length > 0) {
                        loaded = true;
                        break;
                    }
                }

                if (shouldAbort) break;
                if (!loaded) continue;

                await startExportProcess(true, chat.title);
                await new Promise(r => setTimeout(r, 1800));
            }

            if (!shouldAbort) {
                alert('Batch export completed successfully!');
            }
        } catch (err) {
            console.error(err);
            alert(`Batch Info: ${err.message}`);
        } finally {
            isBatchRunning = false;
            shouldAbort = false;
            updateButtonUI('📥 Export .md', '#1d358a');
        }
    }

    const observer = new MutationObserver(() => {
        if (document.body) createExportButton();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
