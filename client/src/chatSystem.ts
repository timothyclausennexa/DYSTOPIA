/**
 * DYSTOPIA ETERNAL - Chat System UI
 * Handles global, zone, clan, and whisper chat channels
 */

import { BaseHTMLUI, FACTION_COLORS } from "./baseUISystem";
import { UI_COLORS, UI_FONTS, UI_SPACING, UI_RADIUS, UI_Z_INDEX, UI_ANIMATION, UI_SHADOWS } from "./ui/uiConstants";

export interface ChatMessage {
    id: number;
    sender: string;
    message: string;
    channel: ChatChannel;
    timestamp: Date;
    faction?: string;
    playerId?: number;
}

export type ChatChannel = 'global' | 'zone' | 'clan' | 'whisper' | 'system';

export class ChatSystemUI extends BaseHTMLUI {
    private messagesContainer: HTMLElement;
    private inputField: HTMLInputElement;
    private currentChannel: ChatChannel = 'global';
    private messages: ChatMessage[] = [];
    private maxMessages = 100;
    private isOpen = true;

    // Event handler storage for cleanup
    private inputKeydownHandler: (e: KeyboardEvent) => void;
    private documentKeydownHandler: (e: KeyboardEvent) => void;
    private inputFocusHandler: () => void;
    private inputBlurHandler: () => void;

    constructor() {
        super({
            containerId: 'dystopia-chat-container',
            cssText: ''
        });

        this.createChatUI();
        this.setupEventListeners();
    }

    private createChatUI() {
        // Configure the base container
        const container = this.container;
        container.style.cssText = `
            position: fixed;
            left: 10px;
            bottom: 10px;
            width: 400px;
            height: 300px;
            background: ${UI_COLORS.background};
            border: 2px solid ${UI_COLORS.border};
            border-radius: ${UI_RADIUS.lg};
            display: flex;
            flex-direction: column;
            font-family: ${UI_FONTS.primary};
            z-index: ${UI_Z_INDEX.menu.chat};
            box-shadow: ${UI_SHADOWS.glowStrong()};
        `;

        // Header with tabs
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            background: rgba(255, 165, 0, 0.2);
            border-bottom: 1px solid ${UI_COLORS.border};
            padding: ${UI_SPACING.sm};
            gap: ${UI_SPACING.sm};
        `;

        const channels: ChatChannel[] = ['global', 'zone', 'clan', 'whisper'];
        channels.forEach(channel => {
            const tab = document.createElement('button');
            tab.textContent = channel.toUpperCase();
            tab.dataset.channel = channel;
            tab.style.cssText = `
                flex: 1;
                padding: ${UI_SPACING.sm} ${UI_SPACING.md};
                background: ${channel === this.currentChannel ? 'rgba(255, 165, 0, 0.5)' : 'rgba(255, 165, 0, 0.2)'};
                border: 1px solid ${UI_COLORS.border};
                border-radius: ${UI_RADIUS.sm};
                color: ${UI_COLORS.text};
                font-size: ${UI_FONTS.sizes.small};
                font-weight: ${UI_FONTS.weights.bold};
                cursor: pointer;
                transition: all ${UI_ANIMATION.normal}ms;
            `;
            tab.onmouseover = () => {
                if (channel !== this.currentChannel) {
                    tab.style.background = 'rgba(255, 165, 0, 0.4)';
                }
            };
            tab.onmouseout = () => {
                if (channel !== this.currentChannel) {
                    tab.style.background = 'rgba(255, 165, 0, 0.2)';
                }
            };
            tab.onclick = () => this.switchChannel(channel);
            header.appendChild(tab);
        });

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            width: 30px;
            padding: ${UI_SPACING.sm};
            background: rgba(255, 0, 0, 0.3);
            border: 1px solid ${UI_COLORS.error};
            border-radius: ${UI_RADIUS.sm};
            color: ${UI_COLORS.text};
            font-size: ${UI_FONTS.sizes.medium};
            font-weight: ${UI_FONTS.weights.bold};
            cursor: pointer;
        `;
        closeBtn.onclick = () => this.toggleChat();
        header.appendChild(closeBtn);

        // Messages area
        const messagesArea = document.createElement('div');
        messagesArea.id = 'chat-messages';
        messagesArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: ${UI_SPACING.md};
            font-size: ${UI_FONTS.sizes.normal};
            color: ${UI_COLORS.text};
        `;

        // Input area
        const inputArea = document.createElement('div');
        inputArea.style.cssText = `
            display: flex;
            padding: ${UI_SPACING.sm};
            gap: ${UI_SPACING.sm};
            border-top: 1px solid ${UI_COLORS.border};
            background: rgba(255, 165, 0, 0.1);
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'chat-input';
        input.placeholder = 'Type message... (Enter to send, T to open chat)';
        input.style.cssText = `
            flex: 1;
            padding: ${UI_SPACING.sm} ${UI_SPACING.md};
            background: ${UI_COLORS.backgroundLight};
            border: 1px solid ${UI_COLORS.border};
            border-radius: ${UI_RADIUS.sm};
            color: ${UI_COLORS.text};
            font-family: ${UI_FONTS.primary};
            font-size: ${UI_FONTS.sizes.normal};
            outline: none;
        `;
        input.onfocus = () => {
            input.style.borderColor = UI_COLORS.success;
            input.style.boxShadow = `0 0 10px rgba(0, 255, 0, 0.5)`;
        };
        input.onblur = () => {
            input.style.borderColor = UI_COLORS.border;
            input.style.boxShadow = 'none';
        };

        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'SEND';
        sendBtn.style.cssText = `
            padding: ${UI_SPACING.sm} ${UI_SPACING.lg};
            background: rgba(0, 255, 0, 0.3);
            border: 1px solid ${UI_COLORS.success};
            border-radius: ${UI_RADIUS.sm};
            color: ${UI_COLORS.text};
            font-size: ${UI_FONTS.sizes.small};
            font-weight: ${UI_FONTS.weights.bold};
            cursor: pointer;
            transition: all ${UI_ANIMATION.normal}ms;
        `;
        sendBtn.onmouseover = () => {
            sendBtn.style.background = 'rgba(0, 255, 0, 0.5)';
        };
        sendBtn.onmouseout = () => {
            sendBtn.style.background = 'rgba(0, 255, 0, 0.3)';
        };
        sendBtn.onclick = () => this.sendMessage();

        inputArea.appendChild(input);
        inputArea.appendChild(sendBtn);

        container.appendChild(header);
        container.appendChild(messagesArea);
        container.appendChild(inputArea);

        this.messagesContainer = messagesArea;
        this.inputField = input;

        // Hide chat by default - user can open with T key
        this.container.style.display = 'none';
        this.isOpen = false;
    }

    private setupEventListeners() {
        // Enter to send message
        this.inputKeydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            } else if (e.key === 'Escape') {
                this.inputField.blur();
            }
        };
        this.inputField.addEventListener('keydown', this.inputKeydownHandler);

        // T key to toggle chat (when not typing)
        this.documentKeydownHandler = (e: KeyboardEvent) => {
            if (e.key === 't' || e.key === 'T') {
                if (document.activeElement !== this.inputField) {
                    e.preventDefault();
                    this.toggleChat();
                    if (this.isOpen) {
                        this.inputField.focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', this.documentKeydownHandler);

        // Prevent game input when typing in chat
        this.inputFocusHandler = () => {
            // Emit event that chat is focused (game should disable input)
            window.dispatchEvent(new CustomEvent('dystopia:chatFocused', {
                detail: { focused: true }
            }));
        };
        this.inputField.addEventListener('focus', this.inputFocusHandler);

        this.inputBlurHandler = () => {
            window.dispatchEvent(new CustomEvent('dystopia:chatFocused', {
                detail: { focused: false }
            }));
        };
        this.inputField.addEventListener('blur', this.inputBlurHandler);
    }

    private toggleChat() {
        this.isOpen = !this.isOpen;
        this.container.style.display = this.isOpen ? 'flex' : 'none';
        if (!this.isOpen) {
            this.inputField.blur();
        }
    }

    private switchChannel(channel: ChatChannel) {
        this.currentChannel = channel;

        // Update tab styles
        const tabs = this.container.querySelectorAll('button[data-channel]');
        tabs.forEach(tab => {
            const tabChannel = (tab as HTMLElement).dataset.channel as ChatChannel;
            (tab as HTMLElement).style.background =
                tabChannel === channel ? 'rgba(255, 165, 0, 0.5)' : 'rgba(255, 165, 0, 0.2)';
        });

        // Update placeholder
        this.inputField.placeholder = `Type message in ${channel}...`;

        // Refresh messages display
        this.refreshMessages();

        console.log(`[DYSTOPIA] Switched to ${channel} channel`);
    }

    private sendMessage() {
        const text = this.inputField.value.trim();
        if (!text) return;

        // Emit event for game to send to server
        window.dispatchEvent(new CustomEvent('dystopia:sendChatMessage', {
            detail: {
                channel: this.currentChannel,
                message: text
            }
        }));

        // Clear input
        this.inputField.value = '';

        console.log(`[DYSTOPIA] Sending message to ${this.currentChannel}: ${text}`);
    }

    public addMessage(message: ChatMessage) {
        this.messages.push(message);

        // Keep only last maxMessages
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        this.refreshMessages();
    }

    public addSystemMessage(text: string) {
        this.addMessage({
            id: Date.now(),
            sender: 'SYSTEM',
            message: text,
            channel: 'system',
            timestamp: new Date()
        });
    }

    private refreshMessages() {
        // Filter messages by current channel (or show all for system)
        const filteredMessages = this.messages.filter(msg =>
            msg.channel === this.currentChannel || msg.channel === 'system'
        );

        // Render messages
        this.messagesContainer.innerHTML = '';
        filteredMessages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.style.cssText = `
                margin-bottom: 5px;
                padding: 5px;
                border-left: 3px solid ${this.getChannelColor(msg.channel)};
                background: rgba(0, 0, 0, 0.3);
                border-radius: 3px;
            `;

            const timestamp = new Date(msg.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const senderColor = msg.channel === 'system' ? '#ffa500' :
                               msg.faction ? this.getFactionColor(msg.faction) : '#fff';

            messageEl.innerHTML = `
                <span style="color: #888; font-size: 10px;">[${timestamp}]</span>
                <span style="color: ${senderColor}; font-weight: bold;"> ${msg.sender}</span>
                <span style="color: #aaa;">:</span>
                <span style="color: #fff;"> ${this.escapeHtml(msg.message)}</span>
            `;

            this.messagesContainer.appendChild(messageEl);
        });

        // Auto-scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    private getChannelColor(channel: ChatChannel): string {
        const colors: Record<ChatChannel, string> = {
            global: '#00ff00',
            zone: '#00bfff',
            clan: '#ff00ff',
            whisper: '#ff69b4',
            system: '#ffa500'
        };
        return colors[channel] || '#fff';
    }

    private getFactionColor(faction: string): string {
        return this.getFactionColorCSS(faction);
    }

    public clearMessages() {
        this.messages = [];
        this.refreshMessages();
    }

    public getChannel(): ChatChannel {
        return this.currentChannel;
    }

    /**
     * Override base destroy to add custom cleanup
     */
    protected onDestroy() {
        // Remove event listeners
        this.inputField.removeEventListener('keydown', this.inputKeydownHandler);
        document.removeEventListener('keydown', this.documentKeydownHandler);
        this.inputField.removeEventListener('focus', this.inputFocusHandler);
        this.inputField.removeEventListener('blur', this.inputBlurHandler);

        console.log('[DYSTOPIA] Chat system destroyed');
    }
}

// Export singleton instance
export let chatSystem: ChatSystemUI | null = null;

export function initChatSystem() {
    if (!chatSystem) {
        chatSystem = new ChatSystemUI();
        console.log('[DYSTOPIA] Chat system initialized');
    }
    return chatSystem;
}
