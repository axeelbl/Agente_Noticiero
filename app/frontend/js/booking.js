document.addEventListener("DOMContentLoaded", () => {
    const reserveBtn = document.getElementById("reserveBtn");
    const bookingModal = document.getElementById("bookingModal");
    const closeBookingBtn = document.getElementById("closeModal");
    const bookingForm = document.getElementById("bookingForm");
    const dateInput = bookingForm?.querySelector("input[name='date']");
    const timeSelect = document.getElementById("timeSelect");

    const manageModal = document.getElementById("manageBookingModal");
    const closeManageBtn = document.getElementById("closeManageModal");
    const manageForm = document.getElementById("manageBookingForm");
    const manageDateInput = manageForm?.querySelector("input[name='new_date']");
    const manageTimeSelect = document.getElementById("manageTimeSelect");
    const modifyBtn = document.getElementById("modifyBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const manageBtn = document.getElementById("manageBtn");

    function resetSelect(selectElement, placeholder = "Selecciona una hora") {
        if (!selectElement) return;
        selectElement.innerHTML = `<option value="">${placeholder}</option>`;
        selectElement.value = "";
    }

    async function loadAvailableHours(date, selectElement) {
        if (!selectElement) return;

        if (!date) {
            resetSelect(selectElement);
            return;
        }

        selectElement.innerHTML = "<option>Cargando...</option>";
        selectElement.value = "";

        try {
            const res = await fetch(`/booking/availability?date=${date}&_=${Date.now()}`, { cache: "no-store" });
            const hours = await res.json();

            selectElement.innerHTML = "";

            if (!hours.length) {
                selectElement.innerHTML = "<option value=''>No hay horas disponibles</option>";
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
            selectElement.innerHTML = "<option value=''>Error cargando horas</option>";
        }
    }

    function openModal(modal) {
        if (!modal) return;
        modal.classList.remove("hidden");
        document.body.classList.add("modal-open");
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add("hidden");

        const hasVisibleModal = Array.from(document.querySelectorAll(".modal")).some(
            element => !element.classList.contains("hidden")
        );

        if (!hasVisibleModal) {
            document.body.classList.remove("modal-open");
        }
    }

    function addChatMessage(message) {
        if (!window.chatUI?.addBotMessageTyping) return;
        window.chatUI.addBotMessageTyping(message);
    }

    document.querySelectorAll("[data-dismiss-modal]").forEach(button => {
        button.addEventListener("click", () => {
            closeModal(document.getElementById(button.dataset.dismissModal || ""));
        });
    });

    [bookingModal, manageModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        closeModal(bookingModal);
        closeModal(manageModal);
    });

    if (reserveBtn && bookingModal && bookingForm && dateInput && timeSelect) {
        reserveBtn.addEventListener("click", event => {
            event.preventDefault();
            openModal(bookingModal);
            resetSelect(timeSelect);

            if (dateInput.value) {
                loadAvailableHours(dateInput.value, timeSelect);
            }
        });

        closeBookingBtn?.addEventListener("click", () => closeModal(bookingModal));
        dateInput.addEventListener("change", () => loadAvailableHours(dateInput.value, timeSelect));
        dateInput.min = new Date().toISOString().split("T")[0];

        bookingForm.addEventListener("submit", async event => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(bookingForm));

            try {
                const res = await fetch("/booking/reserve", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                const result = await res.json().catch(() => null);

                if (!res.ok) throw new Error();

                alert("Cita reservada correctamente");

                addChatMessage(
                    "Reserva confirmada\n\n" +
                    `Cliente: ${data.name}\n` +
                    `Servicio: ${data.service}\n` +
                    `Fecha: ${data.date}\n` +
                    `Hora: ${data.time}\n` +
                    `Contacto: ${data.contact}\n` +
                    `${result?.booking_uuid ? `ID de reserva: ${result.booking_uuid}\n` : ""}` +
                    "\nTe esperamos en la peluqueria."
                );

                closeModal(bookingModal);
                bookingForm.reset();
                resetSelect(timeSelect);
            } catch {
                alert("Esa hora ya no esta disponible");
            }
        });
    }

    if (manageModal && manageForm && manageBtn && manageDateInput && manageTimeSelect) {
        window.openManageBookingModal = function () {
            openModal(manageModal);
            manageForm.reset();
            resetSelect(manageTimeSelect);
        };

        manageBtn.addEventListener("click", event => {
            event.preventDefault();
            window.openManageBookingModal();
        });

        closeManageBtn?.addEventListener("click", () => closeModal(manageModal));
        manageDateInput.min = new Date().toISOString().split("T")[0];
        manageDateInput.addEventListener("change", () => loadAvailableHours(manageDateInput.value, manageTimeSelect));

        modifyBtn?.addEventListener("click", async event => {
            event.preventDefault();

            const data = {
                booking_uuid: manageForm.booking_uuid.value,
                contact: manageForm.contact.value,
                new_date: manageForm.new_date.value,
                new_time: manageForm.new_time.value
            };

            if (!data.booking_uuid || !data.contact || !data.new_date || !data.new_time) {
                alert("Completa todos los campos para modificar");
                return;
            }

            try {
                const res = await fetch("/booking/modify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                if (res.status === 404) {
                    alert("No se ha encontrado la cita");
                    return;
                }

                if (!res.ok) throw new Error();

                alert("Reserva modificada correctamente");

                addChatMessage(
                    "Reserva modificada\n\n" +
                    `ID: ${data.booking_uuid}\n` +
                    `Nueva fecha: ${data.new_date}\n` +
                    `Nueva hora: ${data.new_time}\n\n` +
                    "Te esperamos en la peluqueria."
                );

                closeModal(manageModal);
                manageForm.reset();
                resetSelect(manageTimeSelect);
            } catch {
                alert("Error al modificar la reserva");
            }
        });

        cancelBtn?.addEventListener("click", async () => {
            const booking_uuid = manageForm.booking_uuid.value;
            const contact = manageForm.contact.value;

            if (!contact) {
                alert("Ingresa el contacto de la reserva para cancelar");
                return;
            }

            if (!booking_uuid) {
                alert("Ingresa el ID de reserva para cancelar");
                return;
            }

            if (!confirm("Seguro que quieres cancelar la cita?")) return;

            try {
                const res = await fetch("/booking/cancel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ booking_uuid, contact })
                });

                if (res.status === 404) {
                    alert("No se ha encontrado la cita");
                    return;
                }

                if (!res.ok) throw new Error();

                alert("Reserva cancelada correctamente");

                addChatMessage(
                    "Reserva cancelada\n\n" +
                    `ID: ${booking_uuid}\n` +
                    "La cita ha sido anulada correctamente."
                );

                closeModal(manageModal);
                manageForm.reset();
                resetSelect(manageTimeSelect);
            } catch {
                alert("Error al cancelar la reserva");
            }
        });
    }
});
