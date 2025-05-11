function set_page(){
    // get current csrf token value 
    csrfToken = document.getElementById('csrf_token').value
    
    // load medical data and special remarks
    const parents = document.querySelectorAll('.section-content .content')
    parents.forEach(parent => {
        get_from_server(
            `get_data/${parent.attributes.name.value}`,
            {'parent':parent,'info':parent.attributes.name.value},
            load_user_data)
        });

    // control profile nav buttons
    const btns = document.querySelectorAll('.section-name button')
    btns.forEach(btn => {
        btn.onclick = () => profile_nav_btn(btn,btns);
        // set flex grow to adjust sizes based on content for better visablity
        const content = btn.parentElement.nextElementSibling;
        content.parentElement.style.flexGrow = calc_flex_grow(content);
    })

    // add update profile events handelers
    update_profile_img();
    update_user_name();
    update_profile_data();  
} 

function resize_page(){
    const elements = document.querySelectorAll('.move');
    const sections = document.querySelectorAll('.section-content')
    if (window.innerWidth <= 850){
        // move elements to first page 
        const page = document.querySelector('#left-page');

        if(page.childElementCount < 5){
            elements.forEach(ele  => {
                page.appendChild(ele);
            })

            sections.forEach(section => {
                section.classList.add('d-none');
            })
            sections[0].classList.remove('d-none');
        }
        
    }else{
            const page = document.querySelector('#right-page');
            if(page.childElementCount === 1){
                elements.forEach(ele  => {
                    page.appendChild(ele);
                })
                sections.forEach(section => {
                    section.classList.remove('d-none');
                    section.parentElement.querySelector('button').style.backgroundColor = '#fff'
                })
            }
    }
    
}

function update_profile_img(){
    const img = document.querySelector('#avatar');
    const input = img.querySelector('input');
    img.addEventListener('dblclick', ()=> {
        input.click(); 
    });
    input.addEventListener('change', edit_avatar_img);
    
}

function edit_avatar_img(){
    let input = this;
    const file = input.files[0];
    if (file) {
        if (!validate_img(file))
            return   
        const formData = new FormData();
        formData.append('avatar_img', file);
        post_to_server('/diet/update_profile',formData,
            (data) => {
                input.parentElement.querySelector('img').src = data.image_url;
            })
    }
}

function update_user_name(){
    const username = document.querySelector('#profile-header h1')
    const user_input = username.nextElementSibling.querySelector('input');
    username.addEventListener('dblclick', function(){
        toggel_elements([this,user_input.parentElement]);
        user_input.focus();
    });
    
    user_input.addEventListener('blur', function() {
        edit_user_name(this,username); 
    });
    
    user_input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            this.blur();
        }else if (this.classList.value.includes('is-invalid')){
            this.classList.remove('is-invalid');
        }
    });
}

function edit_user_name(input,username){
    const formData = new FormData();
    formData.append('username', input.value);
    post_to_server('/diet/update_profile',formData,() => {
        username.innerText = input.value;
        input.parentElement.classList.add('d-none');
        username.classList.remove('d-none');   
    },
    () => {
        input.classList.add('is-invalid')
        console.error('Invalid username.');
        return false
    })
}

function update_profile_data(){
    const all_inputs =[... document.querySelectorAll('input')];          
    all_inputs.push(...document.querySelectorAll('select#id_activity_level, select#id_sleep_quality'));
    console.log(all_inputs);
    all_inputs.forEach(input =>{

        if (['date','radio','number'].includes(input.type) || input.tagName === 'SELECT'){
            input.addEventListener('change',function(){
                update_user_data(this);
            })
        } 
            
    }) 
}

function update_user_data(input){
    const formData = new FormData();
    formData.append(input.name, input.value);
    post_to_server('/diet/update_profile',formData,(data) => {
        console.log(data);
        if ('age' in data)
            input.parentElement.previousElementSibling.innerHTML =`<b>Age: </b>${data.age}`;    
    }) 
}

function get_info(info,type){
    if (type =='own')
        return`
            <li class="d-flex justify-content-between">
                ${info.issue}
                <i class="fas fa-minus del-btn" onclick="deleteinfo(this, ${info.id},'own')"></i>
            </li>
        `;
    else if(type == 'medical')
        return `
                <tr>
                    <td>${info.relation}</td>
                    <td>${info.issue}</td>
                    <td style="width: 10%;padding:0px;"><i class="fas fa-minus del-btn" onclick="deleteinfo(this, ${info.id},'medical')"></i></td>
                </tr>
            `;
    else
        return `
            <tr>
                <td>${info.item}</td>
                <td>${info.remark}</td>
                <td style="width: 10%;padding:0px;"><i class="fas fa-minus del-btn" onclick="deleteinfo(this, ${info.id},'remarks')"></i></td>
            </tr>
        `;
}

function load_user_data(data,{parent,info}){
    content = parent.querySelector('ul, table');
    let head ={'medical':['Relation','Issue'],'remarks':['Item','Remark']}
    let html = 
        (info === 'own')?'':
        `<tr>
            <th  style="border-top: 0px !important;padding: 0.15em!important;">${head[info][0]} </th>
            <th  style="border-top: 0px !important;padding: 0.15em!important;">${head[info][1]}</th>
            <th style="width: 10%;"><i class="fas fa-plus add-btn" onclick="showForm(this,'${info}')"></i></th>
        </tr>`;
    if (data.data.length === 0) {
        let add_btn =`<td><i class="fas fa-plus add-btn" onclick="showForm(this,'${info}')"></i></td>`
        let text = (info === 'remarks')?'No Special Remarks Recorded.':'No Medical issue Recorded.'              
        if(info === 'own')
            html =`<li>${text}</li>`
        else
            html =`<tr>
                        <td>${text}</td>
                        ${add_btn}
                    </tr>`
        parent.style.flexGrow = 1;
    } else {
        data.data.forEach(item => {html += get_info(item,info);});   
    }
    content.innerHTML =html;
    if (info !== 'remarks'){
        parent.style.flexGrow = data.data.length +1 ;
    }
    parent.closest('.info-card').style.flexGrow = calc_flex_grow(parent.closest('.section-content'));
}

function profile_nav_btn(btn,btns) {
    // get the contetn 
    const content = btn.parentElement.nextElementSibling;
    // toggel the content visablity
       toggel_elements([content]);
    
    // apply effect based on screen width
    if (window.innerWidth <= 850){
        // highlight active btn 
        btn.style.backgroundColor = 'rgb(var(--highlight-rgb)';
        // reset other btns and sections
        btns.forEach(otherBtn => {
            if (otherBtn !== btn) {
                const otherContent = otherBtn.parentElement.nextElementSibling;
                otherContent.classList.add('d-none');
                otherBtn.style.backgroundColor = '#fff';
            }
        });
    }else{
        // in bigger screen 
        const parent_card = content.parentElement;
        if (content.classList.contains('d-none'))
            //hide element
            parent_card.style.flexGrow = 0;
        else{
            // adjust the size based on displaye content 
            parent_card.style.flexGrow = calc_flex_grow(content);
        } 

    }
        
}

function calc_flex_grow(card_content){
    let total = 0;
    if (card_content) {
     total += card_content.querySelectorAll('tr').length ;
     total += card_content.querySelectorAll('b').length;
     total += parseInt(card_content.querySelectorAll('img').length *1.5);
     total += card_content.querySelectorAll('li').length;
     total += card_content.querySelectorAll('p').length * 2;
     }
     return total
}

function showForm(btn, form , hide=false){
    //hide  other forms
    Array.from(document.forms).forEach(ele => {
        ele.style.display='none'
    })

    const formEle = document.querySelector(`#${form}_form`);
    if (form == 'medical')
        handelDefaultValue(hide);
    // shoq form afte in the correct position
    let content = btn.closest('.content')
    if (!content)
        content = btn.parentElement.nextElementSibling;
    content.insertAdjacentElement('afterend', formEle );
    formEle.style.display='';
    // add event to hide the form
    document.addEventListener("click", (event) => {hideForm(event,formEle)});
    console.log(content);
}

function handelDefaultValue(hide){
    let default_val = document.querySelector('#id_relation');
    if (hide){
        default_val.parentElement.classList.add('d-none');
        default_val.value = '0';
    }else{
        default_val.parentElement.classList.remove('d-none')              
        const ele = default_val.options[0];
        ele.style.display = "none"
        ele.parentElement.value = '1'; 
    }       
}

function hideForm(event,formEle){
    const clickedOutside = !(formEle.contains(event.target) || event.target.classList.contains('add-btn')); 
    if (clickedOutside) {
        console.log('click');
        formEle.reset();
        formEle.style.display = "none";
    }
}

function validateForm(form) {
    const Inputs = form.querySelectorAll('input');
    let allFilled = true;

    Inputs.forEach(input => {
        if (!input.value.trim())  
            allFilled = false;
           
        })
    return allFilled; 
}

function addInfo(btn){
    // get the correct form
    const form = btn.closest('form');
    form.style.display='none';
    if (!validateForm(form))
    {
        form.reset();
        return;
    }
       
    // find form type
    const formData = new FormData(form);
    let type =form.id.replace('_form','');
    let relation = formData.get('relation');
    if (type== 'medical' && relation == '0')
        type = 'own'
        
    
    // send data to server 
    post_to_server(`add_info/${type}`,formData, () => {
        let parent = form.previousElementSibling;
            get_from_server(
                `get_data/${type}`,
                {'parent':parent,'info':type},
                load_user_data)
        
            console.log("info added successfully!");
    })
    
    form.reset();
}

function deleteinfo(btn,itemlId,type) {
    let parent = btn.closest('.content') 
    delete_from_server(
        `delete_info/${type}/${itemlId}`,
        () => {
            console.log("info deleted successfully!");
            get_from_server(
                `get_data/${type}`,
                {'parent':parent,'info':type},
                load_user_data
            )
        }
    )
}