document.addEventListener("DOMContentLoaded", () => {
    const reserveBtn = document.getElementById("reserveBtn");
    const modal = document.getElementById("bookingModal");
    const closeBtn = document.getElementById("closeModal");
    const form = document.getElementById("bookingForm");

    const dateInput = document.querySelector("input[name='date']");
    const timeSelect = document.getElementById("timeSelect");

    if (!dateInput || !timeSelect) return;

    // FUNCIÓN GLOBAL → SIEMPRE pide al backend
    window.loadAvailableHours = async function (date) {
        if (!date) {
            timeSelect.innerHTML = "<option>Selecciona una hora</option>";
            timeSelect.value = "";
            return;
        }

        timeSelect.innerHTML = "<option>Cargando...</option>";
        timeSelect.value = "";

        try {
            const res = await fetch(
                `/booking/availability?date=${date}&_=${Date.now()}`,
                { cache: "no-store" }
            );

            const hours = await res.json();

            timeSelect.innerHTML = "";
            timeSelect.value = "";

            if (!hours.length) {
                timeSelect.innerHTML = "<option>No hay horas disponibles</option>";
                return;
            }

            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Selecciona una hora";
            placeholder.disabled = true;
            placeholder.selected = true;
            timeSelect.appendChild(placeholder);

            hours.forEach(hour => {
                const option = document.createElement("option");
                option.value = hour;
                option.textContent = hour;
                timeSelect.appendChild(option);
            });

        } catch {
            timeSelect.innerHTML = "<option>Error cargando horas</option>";
        }
    };

    // ABRIR MODAL → INVALIDA ESTADO ANTERIOR
    reserveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.classList.remove("hidden");

        // Reset TOTAL
        timeSelect.innerHTML = "<option>Selecciona una hora</option>";
        timeSelect.value = "";

        // Fuerza SIEMPRE recarga si hay fecha
        if (dateInput.value) {
            window.loadAvailableHours(dateInput.value);
        }
    });


    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Cambio de fecha → recarga
    dateInput.addEventListener("change", () => {
        window.loadAvailableHours(dateInput.value);
    });

    dateInput.min = new Date().toISOString().split("T")[0];

    // Enviar reserva desde modal
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = Object.fromEntries(new FormData(form));

        try {
            const response = await fetch("/booking/reserve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error();
            }

            alert("✅ Cita reservada correctamente");

            const { name, service, date, time, contact, booking_uuid } = data;

            if (window.chatUI) {
                const message = 
                    `✅ **Reserva confirmada** ✂️

                    👤 Cliente: ${name}
                    ✂️ Servicio: ${service}
                    📅 Fecha: ${date}
                    ⏰ Hora: ${time}

                    📩 Confirmación enviada a:
                    ${contact}
                    ${booking_uuid ? `🆔 ID de reserva: ${booking_uuid}` : ''}

                    📍Te esperamos en Calle Lorem Ipsum!`;

                window.chatUI.addBotMessageTyping(message);
            }

            modal.classList.add("hidden");
            form.reset();

            // limpia también el select manualmente
            timeSelect.innerHTML = "<option>Selecciona una hora</option>";
            timeSelect.value = "";

        } catch {
            alert("❌ Esa hora ya no está disponible");
        }
    });
});
