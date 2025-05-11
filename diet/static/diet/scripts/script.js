// document.querySelectorAll('.bookmark-nav a').forEach(anchor => {
//     anchor.addEventListener('click', function(e) {
//         e.preventDefault();
//         document.querySelector(this.getAttribute('href')).scrollIntoView({
//             behavior: 'smooth'
//         });
//     });
// });




function toggel_issue(choice){
    const input = document.querySelector('#other_input');
    if (choice.value === '') {
        input.innerHTML = `
        <input type='text' class='form-control' name='issue' placeholder='New issue'>`;
    }else{
        input.innerHTML='';
    }


}





// function addMedicalHistory() {
//     const form = document.getElementById("medicalForm");
//     const formData = new FormData(form);
//     post_to_server("/update_Medical",formData, () => {
//         alert("Medical history added successfully!");
//     },handleFail)
// }


 // fetch(`add_info/${type}`, {
    //     method: "POST",
    //     headers: {
    //         "X-CSRFToken": csrfToken,
    //     },
    //     body: formData
    // })
    // .then(response => response.json())
    // .then(data => {
    //     if (data.success) {
    //         let parent = form.previousElementSibling;
    //         get_from_server(
    //             `get_data/${type}`,
    //             {'parent':parent,'info':type},
    //             load_user_data)
        
    //         console.log("info added successfully!");
           
    //     } else {
    //        console.log("Error: " + data.error);
    //     }
    // })
    // .catch(error => console.error("Error:", error));







