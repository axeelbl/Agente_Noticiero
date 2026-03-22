export class ChatUI {
    constructor(chatContainer, userInput, sendBtn, clearBtn) {
        this.chatContainer = chatContainer;
        this.userInput = userInput;
        this.sendBtn = sendBtn;
        this.clearBtn = clearBtn;
        this.chatActivity = document.getElementById("chatActivity");
        this.chatActivityText = document.getElementById("chatActivityText");

        this.clearBtn.addEventListener("click", () => this.clearChat());
    }

    createMessage(role, label) {
        const wrapper = document.createElement("article");
        wrapper.classList.add("message", role);

        const meta = document.createElement("div");
        meta.className = "message-meta";
        meta.textContent = `${label} | ${this.getTimeLabel()}`;

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        wrapper.append(meta, bubble);
        return { wrapper, bubble };
    }

    getTimeLabel() {
        return new Intl.DateTimeFormat("es-ES", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date());
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    addUserMessage(text) {
        const { wrapper, bubble } = this.createMessage("user", "Tu");
        bubble.textContent = text;
        this.chatContainer.appendChild(wrapper);
        this.scrollToBottom();
    }

    async addBotMessageTyping(text, speed = 10) {
        return new Promise(resolve => {
            const { wrapper, bubble } = this.createMessage("bot", "Asistente");
            const typingNode = document.createElement("p");
            bubble.appendChild(typingNode);
            this.chatContainer.appendChild(wrapper);
            this.scrollToBottom();

            let index = 0;
            const source = text ?? "";

            const typeChar = () => {
                if (index < source.length) {
                    typingNode.textContent += source[index++];
                    this.scrollToBottom();
                    setTimeout(typeChar, speed);
                    return;
                }

                bubble.innerHTML = "";
                this.renderRichText(bubble, source);
                this.scrollToBottom();
                resolve();
            };

            typeChar();
        });
    }

    renderRichText(container, text) {
        const normalized = (text ?? "").replace(/\r\n/g, "\n").trim();

        if (!normalized) {
            const emptyParagraph = document.createElement("p");
            emptyParagraph.textContent = "";
            container.appendChild(emptyParagraph);
            return;
        }

        const blocks = normalized.split(/\n{2,}/);

        blocks.forEach(block => {
            const lines = block.split("\n").filter(line => line.length > 0);
            const isList = lines.length > 1 && lines.every(line => /^[*-]\s+/.test(line.trim()));

            if (isList) {
                const list = document.createElement("ul");
                lines.forEach(line => {
                    const item = document.createElement("li");
                    this.appendInlineFormatting(item, line.replace(/^[*-]\s+/, ""));
                    list.appendChild(item);
                });
                container.appendChild(list);
                return;
            }

            const paragraph = document.createElement("p");
            lines.forEach((line, lineIndex) => {
                this.appendInlineFormatting(paragraph, line);
                if (lineIndex < lines.length - 1) {
                    paragraph.appendChild(document.createElement("br"));
                }
            });
            container.appendChild(paragraph);
        });
    }

    appendInlineFormatting(container, text) {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);

        parts.forEach(part => {
            if (!part) return;

            if (/^\*\*[^*]+\*\*$/.test(part)) {
                const strong = document.createElement("strong");
                strong.textContent = part.slice(2, -2);
                container.appendChild(strong);
                return;
            }

            container.appendChild(document.createTextNode(part));
        });
    }

    setPendingState(isPending) {
        if (this.chatActivity) {
            this.chatActivity.classList.toggle("is-thinking", isPending);
        }

        if (this.chatActivityText) {
            this.chatActivityText.textContent = isPending
                ? "Estoy preparando una respuesta"
                : "Escribe lo que necesites";
        }
    }

    clearChat() {
        if (!confirm("Seguro que quieres borrar la conversacion?")) return;
        this.chatContainer.innerHTML = "";
        this.userInput.value = "";
        this.setPendingState(false);
        this.userInput.focus();
    }
}
