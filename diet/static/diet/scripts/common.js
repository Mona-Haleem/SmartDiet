// set document 
let active = 'home';
const StaticUrl = '/static/';
const MediaUrl = '/media/';
let size = 0;

// GET CSRF TOKEN
let csrfToken ='';

const now = new Date();

window.addEventListener('resize', handleResize);

// set page
document.addEventListener('DOMContentLoaded', () => {
    csrfToken = document.querySelector('#csrf_token').value;
    // resize and position a div to avoid to much nesting
    set_main_dim();
    // togel theme
    const toggleButton = document.getElementById('theme-toggle');
    toggleButton.addEventListener('click', function() {
        toggel_theme(toggleButton);
    });

    const theme = localStorage.getItem('theme');
    document.documentElement.setAttribute('data-theme', theme);
    toggleButton.innerText = theme === 'dark' ? 'L' : 'D';
    
    // active nav 
    set_active_item();
    console.log(active);

    // responsive nav icons
    handleResize()
    
    //set the current page onload 
    set_page();    
});


function toggel_theme(btn){
    const theme = localStorage.getItem('theme') === 'dark' ? '' : 'dark';
    btn.innerText = theme === 'dark' ? 'L' : 'D';
    localStorage.setItem('theme',theme)
    document.documentElement.setAttribute('data-theme', theme);
}

function set_active_item(){
    // check path and current active item
    let path = window.location.pathname;
    if (path.replace('/diet') === '')
        path = '/diet/home';
    if (path.includes(active))
        return
        
    // set the new active item
    const navItems = document.querySelectorAll('.nav-sections span');
        
    navItems.forEach(item => {
        if (path.includes(item.innerHTML.toLowerCase())) {
            active = item.innerHTML.toLowerCase();
            let btn = item.closest('button');
            btn.parentNode.insertBefore(btn, btn.parentNode.firstChild); 
        }
    });

}

function set_main_dim(){
    const sourceElement = document.getElementById('main_app');
    const targetElement = document.getElementById('main-content');

    const sourceRect = sourceElement.getBoundingClientRect();
    
    targetElement.style.left = `${sourceRect.left + 3}px`;
    targetElement.style.top = `${sourceRect.top + 3}px`;
    targetElement.style.width = `${sourceRect.width - 6}px`;
    targetElement.style.height = `${sourceRect.height - 6}px`;
}

function handleResize() {
    set_main_dim();
    resize_icons();
    resize_page();

}

function resize_icons(){       
    if (window.innerWidth < 850){
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const text = item.querySelector('.nav-text');
            if (item.clientWidth < 75) {
                text.style.display = 'none';
                item.style.fontSize = '150%';
            } else {
                text.style.display = 'inline';
                item.style.fontSize = '100%';
            }
        });   
    }
}


function updateElementsGroups(eleId,collectionId,eleType,collection,removable){
    let select = document.querySelector('#groupEditor');
    console.log(select,eleId,collectionId,eleType,collection,removable);
    post_to_server(`/diet/collections/${collection}`,JSON.stringify({
        'eleId':eleId,
        'collectionId':collectionId,
        'eleType':eleType}),(data) => {
            console.log(removable)
            if (removable){
                if (select){
                    let option = document.createElement('option');  
                    option.value = collection;
                    option.textContent = removable.textContent;  
                    select.append(option);               
                }
                removable.remove()

            }else if(data){
                let parent = document.querySelector('.groups');
                console.log(data)
                let newElement = document.createElement('span')
                newElement.className ="btn btn-danger"
                newElement.innerHTML =`
                
                    <a  href="/diet/${eleType}/viewer?collection=${data.collection[1]}">
                        ${data.collection[0]}
                    </a>
                    <i class="fas fa-minus" style="width: 15px;" onclick="updateElementsGroups(${eleId},0,'${eleType}',${data.collection[1]},this.parentElement)"></i>
                
                `
                parent.insertBefore(newElement, parent.lastElementChild);
                if (select){
                    let options = select.options;
                    for (let i =0;i <options.length;i++){
                        if (options[i].value ==collectionId)
                            options[i].remove();
                    }
                }
            }
     })
}

async function setCurrPlan(plan,display,replace=true){
    if (plan == 'new'){
        console.log('new');
        return
    }
    // get required plan data
    [plan_id , duration,title] = JSON.parse(plan);
    console.log(plan_id , duration,title)
    // check for conflicting logs
    let logs = await getPeriodLog(duration);
    //decide wether to replace or keep the logs
    if(logs.length > 0)
        replace = window.confirm(`Assign the plan for entire duration and replace current logs : ${logs}`)
    
    // update current plan and today logs
    post_to_server(`/diet/current_plan`,JSON.stringify({
        'plan_id':plan_id,
        'replace':replace,
    }),setCurrentPlan,null,{'display':display})
}

async function getPeriodLog(duration){
    let logs = [];

    let today = new Date(); 
    today.setHours(0, 0, 0, 0);

    let currentDate = new Date(); 

    let endDate = new Date(currentDate);
    endDate.setDate(currentDate.getDate() + duration);
    
    while (currentDate <= endDate) {
        let month = currentDate.getMonth() + 1 ;
        let year = currentDate.getFullYear();  
           
        await post_to_server(`/diet/logs`,JSON.stringify({
            'month':month,
            'year':year,
        }),(data) =>{
                logs +=  Object.keys(data.logs).filter(dateStr => {
                    const date = new Date(dateStr.split('-').reverse().join('-')); 
                    date.setHours(0, 0, 0, 0);
                    return date > today && date < endDate;
                });
                console.log(logs.length);
                            
            }    
        )

        currentDate.setDate(1)
        currentDate.setMonth(currentDate.getMonth() + 1);
        console.log(currentDate);
        
    }
    return logs
}

function setCurrentPlan(data,{display}){
    console.log(data)
    let ele;
    if (data.plan.plan_type == 'full'){
        ele = document.querySelector('#diet_title')
        ele.innerHTML = `${data.plan.title} - ${data.plan.diet}`;
        ele.parentNode.querySelector('img').src =(data.plan.diet_img != '/static/images/logo.png')?data.plan.diet_img:data.plan.img;                    
        ele = document.querySelector(`#exercies_title`)
        ele.innerHTML = `${data.plan.title} - ${data.plan.exercise}`;
        ele.parentNode.querySelector('img').src =(data.plan.exercise_img != '/static/images/logo.png')?data.plan.exercise_img:data.plan.img;                        
    }else{
        ele = document.querySelector(`#${display}`)
        ele.innerHTML = data.plan.title
        ele.parentNode.querySelector('img').src = data.plan.img
        display = (display == 'diet_title')?'exercies_title':'diet_title';
        ele = document.querySelector(`#${display}`)
        if (ele.innerHTML.includes(' - '))
            ele.innerHTML = ele.innerHTML.replace(/^.* - /,'');
        
    }    
}

function toggel_elements(elements){
    elements.forEach(ele => {
        if (ele.classList.contains('d-none')){
            ele.classList.remove('d-none');
        }else{
            ele.classList.add('d-none');
        }    
    });
}

function validate_img(img){
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(img.type)) {
        console.error('Unsupported file type.');
        return false;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (img.size > maxSize) {
        console.error('File size exceeds limit of 5MB.');
        return false;
    }

    return true
}

function formatDate(dateString){
    const date = new Date(dateString);
    const diff = now - date;
    const diffInSeconds = Math.floor(diff / 1000);
    
    if (diffInSeconds > 604800) { 
        return date.toLocaleDateString(); 
    } else if (diffInSeconds > 86400) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} days ago`;
    } else if (diffInSeconds > 3600) { 
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} H ago`;
    } else if (diffInSeconds > 60) { 
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} Min ago`;
    } else {
        return 'Just now';
    }
};

function formatDuration(durationString){
    const regex = /P(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = durationString.match(regex);
    
    const days = matches[1] ? parseInt(matches[1]) : 0;
    const hours = matches[2] ? parseInt(matches[2]) : 0;
    const minutes = matches[3] ? parseInt(matches[3]) : 0;

    let result = '';
    if (days > 0) result += `${days} day${days > 1 ? 's' : ''} `;
    if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''} `;
    if (minutes > 0) result += `${minutes} min${minutes > 1 ? 's' : ''}`;

    return result.trim() || '0 mins'; 
};

function process_data(element) {
    element.creation_date = formatDate(element.creation_date);
    element.last_modification = formatDate(element.last_modification);

    if (element.duration) {
        element.duration = formatDuration(element.duration);
    }
    return element; 
}

async function post_to_server(url,body,handleSucsses,handleFail,args){
    let headers = {'X-CSRFToken': csrfToken}
    if (!(body instanceof FormData))
        headers['Content-Type'] ='application/json';

    fetch(`${url}`, {
            method: 'POST',
            headers:headers, 
            body: body,
    }).then((response) => {
        if (!response.ok) {
            throw new Error('HTTP error, status = ' + response.status); // Throw error to trigger catch block
        }
        return response.json(); 
    })
    .then(data => handleSucsses(data,args))
    .catch((error) => {
        if (handleFail){
            handleFail();
        }
        console.error('Error:', error);
    })
        
}
async function patch_to_server(url,body,handleSucsses,handleFail,args){
    let headers = {'X-CSRFToken': csrfToken}
    if (!(body instanceof FormData))
        headers['Content-Type'] ='application/json';

    fetch(`${url}`, {
            method: 'PATCH',
            headers:headers, 
            body: body,
    }).then((response) => {
        if (!response.ok) {
            throw new Error('HTTP error, status = ' + response.status); 
        }
        return response.json(); 
    })
    .then(data => handleSucsses(data,args))
    .catch((error) => {
        if (handleFail){
            handleFail();
        }
        console.error('Error:', error);
    })
        
}
async function get_from_server(url,args,handleSucsses,handleFail){
    fetch(url)
    .then(response => response.json())
    .then(data => {
        console.log(url,data);
        handleSucsses(data,args);
    })
    .catch(error => {
        console.error('Error:', error);
        if (handleFail){
            handleFail(args);
        }
    });
}

async function delete_from_server(url,handleSucsses,handleFail,args){
    let headers = {'X-CSRFToken': csrfToken}
   // if (!(body instanceof FormData))
       // headers['Content-Type'] ='application/json';

    try {
        const response = await fetch(`${url}`, {
            method: 'DELETE',
            headers:headers, 
        });
        if (response.ok) {
            const data = await response.json();
            handleSucsses(data,args);   
        } 
    } catch (error) {
        if (handleFail){
            handleFail();
        }
        console.error('Error:', error);
    }
}



// function getCookie(name) {
//     let cookieValue = null;
//     if (document.cookie && document.cookie !== '') {
//         const cookies = document.cookie.split(';');
//         for (let i = 0; i < cookies.length; i++) {
//             const cookie = cookies[i].trim();
//             if (cookie.substring(0, name.length + 1) === (name + '=')) {
//                 cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//                 break;
//             }
//         }
//     }
//     return cookieValue;
// }