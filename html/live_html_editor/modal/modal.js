// Get modal and buttons
const modalOverlay = document.getElementById('modal-overlay');
const openModalButton = document.getElementById('open-modal');
const closeModalButton = document.getElementById('close-modal');

// Open the modal
openModalButton.addEventListener('click', () => {
  modalOverlay.style.display = 'flex'; // Show the modal by setting display to flex
});

// Close the modal
closeModalButton.addEventListener('click', () => {
  modalOverlay.style.display = 'none'; // Hide the modal by setting display to none
});

// Close modal when clicking outside the modal content
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.style.display = 'none'; // Hide the modal
  }
});
