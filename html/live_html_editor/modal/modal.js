// All modals must follow the structure specified by the following function
function configure_modal(modal_element, toggle_button_element) {

  // Open the modal
  toggle_button_element.addEventListener('click', () => {
    modal_element.style.display = 'flex'; // Show the modal by setting display to flex
  });
  configure_close_functionality_for_modal(modal_element);
}


function configure_close_functionality_for_modal(modal_element) {
  // precondition your modal element must have 
  const closeModalButton = modal_element.querySelector('#close-modal');
  assert(closeModalButton, "your modal must have a #close-modal sub element");
  // Close the modal
  closeModalButton.addEventListener('click', () => {
    modal_element.style.display = 'none'; // Hide the modal by setting display to none
  });

  // Close modal when clicking outside the modal content
  modal_element.addEventListener('click', (e) => {
    if (e.target === modal_element) {
      modal_element.style.display = 'none'; // Hide the modal
    }
  });
}


const modalOverlay = document.getElementById('modal-overlay');
const openModalButton = document.getElementById('open-modal');

configure_modal(modalOverlay, openModalButton);

// const fast_insert_modal_button = document.getElementById("open-fast-insert-modal");
const fast_insert_modal = document.getElementById("fast-insert-modal");

configure_close_functionality_for_modal(fast_insert_modal);


