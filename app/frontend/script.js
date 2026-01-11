document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.getElementById("chatContainer");
    const userInput = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const clearBtn = document.getElementById("clearBtn");

    const API_URL = "/chat";

    const baseFace = document.getElementById("baseFace");
    const mouthOpenImg = document.getElementById("mouthOpenImg");
    const avatarStatus = document.getElementById("avatarStatus");

    const avatar = document.getElementById("avatar");
    const avatarHalo = document.getElementById("avatarHalo");

    let mouthOpen = false;
    let talkingInterval = null;

    // Parpadeo independiente
    setInterval(() => {
        if (talkingInterval) return;

        baseFace.src = "/static/eyes_closed_mouth_closed.png";
        setTimeout(() => {
            baseFace.src = "/static/eyes_open_mouth_closed.png";
        }, 200);
    }, 4000);


    // Boca animada mientras el bot responde
    function startTalking() {
        if (talkingInterval) return;

        // Mostrar halo y agrandar avatar
        avatarHalo.style.opacity = "1";
        avatar.style.transform = "scale(1.1)";


        talkingInterval = setInterval(() => {
            mouthOpen = !mouthOpen;
            mouthOpenImg.style.opacity = mouthOpen ? "1" : "0";
        }, 300);
    }

    function stopTalking() {
        clearInterval(talkingInterval);
        talkingInterval = null;
        mouthOpen = false;
        mouthOpenImg.style.opacity = "0";

        // Ocultar halo y volver al tamaño normal
        avatarHalo.style.opacity = "0";
        avatar.style.transform = "scale(1)";
    }

    

    function addMessage(text, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message", sender);
        msgDiv.textContent = text;
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, "user");
        userInput.value = "";

        avatarStatus.textContent = "🟡 Pensando...";
        startTalking();

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_message: text })
            });

            const data = await response.json();
            stopTalking();
            avatarStatus.textContent = "🟢 Online";
            addMessage(data.bot_message, "bot");

        } catch (err) {
            stopTalking();
            avatarStatus.textContent = "🔴 Error";
            addMessage("Error conectando con el servidor.", "bot");
        }
    }


    function clearChat() {
        if (!confirm("¿Seguro que quieres borrar la conversación?")) return;
        chatContainer.innerHTML = "";
        userInput.value = "";
    }

    // Mensaje de bienvenida automático
    setTimeout(() => {
        addMessage(
            "¡Hola! 👋 Soy AxelBot, un chatbot que actúa como mi clon profesional.\n\n" +
            "Puedes preguntarme sobre mi experiencia, proyectos, estudios, habilidades técnicas o cualquier otra cosa que quieras saber sobre mí.",
            "bot"
        );
    }, 300);

    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });
    clearBtn.addEventListener("click", clearChat);


});