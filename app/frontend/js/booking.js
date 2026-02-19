document.addEventListener("DOMContentLoaded", () => {
    /** ================================
     *  ELEMENTOS DEL DOM
     * ================================ */
    // Modal de reserva
    const reserveBtn = document.getElementById("reserveBtn");
    const bookingModal = document.getElementById("bookingModal");
    const closeBookingBtn = document.getElementById("closeModal");
    const bookingForm = document.getElementById("bookingForm");
    const dateInput = bookingForm.querySelector("input[name='date']");
    const timeSelect = document.getElementById("timeSelect");

    // Modal de gestión
    const manageModal = document.getElementById("manageBookingModal");
    const closeManageBtn = document.getElementById("closeManageModal");
    const manageForm = document.getElementById("manageBookingForm");
    const manageDateInput = manageForm.querySelector("input[name='new_date']");
    const manageTimeSelect = document.getElementById("manageTimeSelect");
    const modifyBtn = document.getElementById("modifyBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const manageBtn = document.getElementById("manageBtn");

    /** ================================
     *  FUNCIONES REUTILIZABLES
     * ================================ */
    // Carga horas disponibles en un select
    async function loadAvailableHours(date, selectElement) {
        if (!date) {
            selectElement.innerHTML = "<option>Selecciona una hora</option>";
            selectElement.value = "";
            return;
        }

        selectElement.innerHTML = "<option>Cargando...</option>";
        selectElement.value = "";

        try {
            const res = await fetch(`/booking/availability?date=${date}&_=${Date.now()}`, { cache: "no-store" });
            const hours = await res.json();

            selectElement.innerHTML = "";
            if (!hours.length) {
                selectElement.innerHTML = "<option>No hay horas disponibles</option>";
                return;
            }

            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Selecciona una hora";
            placeholder.disabled = true;
            placeholder.selected = true;
            selectElement.appendChild(placeholder);

            hours.forEach(hour => {
                const option = document.createElement("option");
                option.value = hour;
                option.textContent = hour;
                selectElement.appendChild(option);
            });

        } catch {
            selectElement.innerHTML = "<option>Error cargando horas</option>";
        }
    }

    // Abrir modal
    function openModal(modal) {
        modal.classList.remove("hidden");
    }

    // Cerrar modal
    function closeModal(modal) {
        modal.classList.add("hidden");
    }

    /** ================================
     *  RESERVA NUEVA
     * ================================ */
    if (reserveBtn && bookingModal && bookingForm && dateInput && timeSelect) {
        // Abrir modal
        reserveBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openModal(bookingModal);

            // Reset select
            timeSelect.innerHTML = "<option>Selecciona una hora</option>";
            timeSelect.value = "";

            if (dateInput.value) loadAvailableHours(dateInput.value, timeSelect);
        });

        // Cerrar modal
        closeBookingBtn.addEventListener("click", () => closeModal(bookingModal));

        // Cambiar fecha → recarga horas
        dateInput.addEventListener("change", () => loadAvailableHours(dateInput.value, timeSelect));

        // Fecha mínima
        dateInput.min = new Date().toISOString().split("T")[0];

        // Enviar reserva
        bookingForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(bookingForm));

            try {
                const res = await fetch("/booking/reserve", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                if (!res.ok) throw new Error();

                alert("✅ Cita reservada correctamente");

                // Mensaje en chat si existe
                if (window.chatUI) {
                    const { name, service, date, time, contact, booking_uuid } = data;
                    const message = 
                        `✅ **Reserva confirmada** ✂️
                        👤 Cliente: ${escapeHtml(name)}
                        ✂️ Servicio: ${escapeHtml(service)}
                        📅 Fecha: ${escapeHtml(date)}
                        ⏰ Hora: ${escapeHtml(time)}
                        📩 Confirmación enviada a: ${escapeHtml(contact)}
                        ${booking_uuid ? `🆔 ID de reserva: ${booking_uuid}` : ''}
                        📍Te esperamos en Calle Lorem Ipsum!`;
                    window.chatUI.addBotMessageTyping(message);
                }

                closeModal(bookingModal);
                bookingForm.reset();
                timeSelect.innerHTML = "<option>Selecciona una hora</option>";
                timeSelect.value = "";

            } catch {
                alert("❌ Esa hora ya no está disponible");
            }
        });
    }

    /** ================================
     *  GESTIÓN DE RESERVA (MODIFICAR / CANCELAR)
     * ================================ */
    if (manageModal && manageForm && manageBtn && manageDateInput && manageTimeSelect) {
        // Abrir modal de gestión
        manageBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openManageBookingModal();
        });

        window.openManageBookingModal = function () {
            openModal(manageModal);
            manageForm.reset();
            manageTimeSelect.innerHTML = "<option value=''>Selecciona una hora</option>";
        };

        // Cerrar modal
        closeManageBtn.addEventListener("click", () => closeModal(manageModal));

        // Cambiar fecha → recarga horas
        manageDateInput.addEventListener("change", () => loadAvailableHours(manageDateInput.value, manageTimeSelect));

        // MODIFICAR reserva
        modifyBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const data = {
                booking_uuid: manageForm.booking_uuid.value,
                new_date: manageForm.new_date.value,
                new_time: manageForm.new_time.value
            };

            if (!data.booking_uuid || !data.new_date || !data.new_time) {
                alert("❌ Completa todos los campos para modificar");
                return;
            }

            try {
                const res = await fetch("/booking/modify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                if (res.status === 404) {
                    alert("❌ No se ha encontrado la cita");
                    return;
                }

                if (!res.ok) throw new Error();

                alert("✅ Reserva modificada correctamente");
                // Mensaje en chat si existe
                if (window.chatUI) {
                    const message = `🔁 **Reserva Modificada**

                        🆔 ID: ${data.booking_uuid}
                        📅 Nueva fecha: ${data.new_date}
                        ⏰ Nueva hora: ${data.new_time}

                        📍Te esperamos en Calle Lorem Ipsum!`;
                    window.chatUI.addBotMessageTyping(message);
                }
                closeModal(manageModal);
                manageForm.reset();

            } catch {
                alert("❌ Error al modificar la reserva");
            }
        });

        // CANCELAR reserva
        cancelBtn.addEventListener("click", async () => {
            const booking_uuid = manageForm.booking_uuid.value;
            if (!booking_uuid) {
                alert("❌ Ingresa el ID de reserva para cancelar");
                return;
            }

            if (!confirm("⚠️ ¿Seguro que quieres cancelar la cita?")) return;

            try {
                const res = await fetch("/booking/cancel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ booking_uuid })
                });
                
                if (res.status === 404) {
                    alert("❌ No se ha encontrado la cita");
                    return;
                }
                
                if (!res.ok) throw new Error();

                alert("✅ Reserva cancelada correctamente");
                // Mensaje en chat si existe
                if (window.chatUI) {
                    const message = `❌ **Reserva Cancelada**

                        🆔 ID: ${booking_uuid}

                        Tu cita ha sido cancelada correctamente.`;
                    window.chatUI.addBotMessageTyping(message);
                }
                closeModal(manageModal);
                manageForm.reset();

            } catch {
                alert("❌ Error al cancelar la reserva");
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
