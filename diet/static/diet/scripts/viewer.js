let collection;
let parent ='';
let displayed = 0;
let navigate = false;
let isCollection=false;
let viewer;
let options = [];

window.addEventListener('popstate',(event) => {
    console.log('state' ,event.state)
    let state = event.state
    
    navigate = true;
    if(state && state.hasOwnProperty('collection')){
        isCollection =true;
        display_collection(state.collection);
    }else{
        isCollection =false;
        get_elements(active);
        document.querySelector('#collections').querySelector('i').className='fas fa-folder';
    }
    navigate = false;

    
})

function showEleCategories(type){
    if (type == 'plans'){
        document.querySelector('#plan-category').classList.remove('d-none'),
        document.querySelector('#recipe-category').classList.add('d-none'),
        document.querySelector('#duration').classList.remove('d-none')
    }else{
        document.querySelector('#plan-category').classList.add('d-none'),
        document.querySelector('#recipe-category').classList.remove('d-none'),
        document.querySelector('#duration').classList.add('d-none')
    }
}
function set_page(){
    
    //get the number of items to load
    size = get_size();
    //load the required collections or elements
    console.log(history.state);
    let view_collections = new URLSearchParams(window.location.search);
    collection = view_collections.get('collection');
    navigate = true;
    if ((history.state && history.state.hasOwnProperty('collection'))){
        display_collection(history.state.collection);
    }else if(collection || collection == 0){
        display_collection(collection);
    }else{
        isCollection=false;
        get_elements(active);
        document.querySelector('#collections').querySelector('i').className='fas fa-folder';
    }
    navigate =false;
    //document.querySelector('#form_csrf').value=document.querySelector('#csrf_token').value;
    viewer = document.querySelector('.item_viewer');
    let filters = document.querySelector('#filters-form'); 
    let create =document.querySelector('#create-form');
    let type_Selector = document.querySelector('#type'); 
    type_Selector.addEventListener('change',() =>{
        console.log(this.value);
        showEleCategories(this.value)
    })
    
    // add buttons event listener
    document.querySelector('#collections').addEventListener('click',() => {
        if (isCollection){
            post_to_server(`/diet/update_collections/new/${collection}`,'',(data) => {
                let collection_data = data.collection
                console.log(collection_data )
                let newElement = collectionTemp(collection_data ) 
                viewer.innerHTML = newElement + viewer.innerHTML;
                activeRenameInput(viewer.firstElementChild);
                if (viewer.children.length > size)
                    viewer.lastElementChild.remove()

            })
        }else{
            document.querySelector('.filter-menu').innerHTML='';
            display_collection(0);
            document.querySelector('#collections').querySelector('i').className='fas fa-folder-plus'
        }
    })
    document.querySelector('#add').addEventListener('click',() => {
        if (collection)
            document.querySelector('#parent').value = collection;
        if (active == 'plans')
            type_Selector.options[0].selected = true;
        else
            type_Selector.options[1].selected = true;
    
        if (isCollection)
            type_Selector.classList.remove('d-none')
        else
            type_Selector.classList.add('d-none')
            
        showEleCategories(active);
        toggel_elements([filters,create])
    })
    document.querySelector('#cancel').addEventListener('click',() => {
        console.log(filters,create)
        toggel_elements([filters,create])
     })
    // load elements based on filters
    document.querySelector('form').addEventListener('change',() => {
        displayed = 0;
        get_elements(active);
    })
    document.querySelector('form input').addEventListener('input',() => {
        displayed = 0;
        get_elements(active);
    })

    //get next elements
    document.querySelector('#next').addEventListener('click',()=>{
        displayed = 0;
        let anchor = viewer.children[size-1]
        console.log(anchor);
        get_elements(anchor.dataset.type,anchor.id,type='next',collection)
        
    })
    document.querySelector('#prev').addEventListener('click',()=>{
        displayed = 0;
        let anchor = viewer.firstElementChild
        console.log(anchor) 
        get_elements(anchor.dataset.type,anchor.id,type='prev',collection)
        
    })
   
}

function setFilters(options){
    console.log(options)
    let select = document.querySelector('#filter');
    let allOptions =Array.from(select.children);
    console.log(allOptions)
    let displayedOptions = allOptions.map(option =>option.querySelector('input').value);
    
    allOptions.forEach(opt => {
       if (!options.includes(opt.querySelector('input').value)) {
             select.removeChild(opt);
         }
    });

    options.forEach(opt => {
        if (!displayedOptions.includes(opt)) {
            let option = document.createElement('div');
            option.className ='dropdown-item';
            option.innerHTML =
                 `<input type="checkbox" id="${opt}" name="filter" class="hidden-checkbox" value="${opt}" checked >
                 <label for="${opt}" class="label">${opt}</label>
                 `
             select.append(option);
             select.lastElementChild.querySelector('input').onchange = handleCheckboxChange(opt);
         }
    })
}

function handleCheckboxChange(opt) {
    const plansCheckbox = document.getElementById('plans');
    const recipesCheckbox = document.getElementById('recipes');
    
    if (opt === 'plans') {
        return function(event) {
            ['diet', 'exercies', 'full'].forEach(id => {
            const checkbox = document.querySelector(`#${id}`);
            if (checkbox)
                checkbox.checked = event.target.checked;
            });
        }
    } else if (opt === 'recipes') {
        return function(event) {
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            allCheckboxes.forEach(checkbox => {
            if (!['diet', 'exercies', 'full', 'plans'].includes(checkbox.id)) {
                checkbox.checked = event.target.checked;
            }
            });
        }
    } else if (['diet', 'exercies', 'full'].includes(opt)) {
        return function(event) {
            if (plansCheckbox){
                if (!['diet', 'exercies', 'full'].some(id => document.getElementById(id)?.checked)) {
                    plansCheckbox.checked = false;
                }else{
                    plansCheckbox.checked = true; 
                }
            }
        }
    }else if (recipesCheckbox) {
        return function(event) {
             const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
             const recipeRelatedCheckboxes = Array.from(allCheckboxes).filter(checkbox => !['diet', 'exercises', 'full', 'plans'].includes(checkbox.id));
             if (!recipeRelatedCheckboxes.some(checkbox => checkbox.checked)) {
                 recipesCheckbox.checked = false;
             }else{
                recipesCheckbox.checked = true;
             }
 
        }
    }
}

  
function resize_page(){
    if (get_size() !== size){
        size = get_size();
        let viewer = document.querySelector('.item_viewer');
        let children = viewer.children;
        for (let i = 0; i < children.length; i++) {
            children[i].style.display =(i >= size)?'none':'inline-block';
        }
    }  
} 

function display_collection(id=0,container){
    if (container && container.classList.contains('edit-mode')){
        return
    }
    displayed = 0;
    document.querySelector('#filters-form').classList.remove('d-none'); 
    document.querySelector('#create-form').classList.add('d-none');
    
    isCollection=true;
    if (!navigate)
        history.pushState({'collection':id},'',`?collection=${id}`);
    collection = id;
    get_elements(active,anchor=0,type='next')  
}

function get_elements(ele_type,anchor=0,type='next'){
    const form =document.querySelector('form');
    const formData = new FormData(form);
    
    formData.append('anchor',anchor);
    formData.append('type',type);
    formData.append('isCollection',isCollection);
    console.log(formData.getAll('filter'));  

    if (isCollection)
        formData.append('size',size - displayed);
    else
        formData.append('size',size);

    formData.append('group_id',collection);

    // formData.forEach((value, key) => {
    //     console.log(`${key}: ${value}`);
    // });

    post_to_server(`/diet/${ele_type}/viewer`,formData,(data) => {
            console.log(data,data.elements.map(process_data));
            setFilters(data.types);
            load_elements(data.elements,ele_type,collection)
            set_nav_btns(data)
         })
}

let element_temp = (ele,type) =>{
    let description = 
            (type == 'plans')?
            `a ${ele.duration} ${ele.type} plan for ${ele.goal}`
            :`${ele.category}`; 
       
    let favourite = (ele.favourite)?'&#9829':'&#9825'; 
    let color = (type == 'plans')?ele.type:'diet';   
    let img_path = (ele.image_url.includes('/static/'))?ele.image_url:`/media/${ ele.image_url}`;
    return `<div class="ele-container" id='${ele.id}' data-type="${type}" >
                <div class="dropdown" style="position:absolute;top:0; right:0;" onclick="(this) =>{this.parent}">
                   <span data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-ellipsis-v"></i>
                   </span>
                    <ul class="dropdown-menu">
                        <li class="dropdown-item"  onclick="deleteElement('${type}',${ele.id},this.closest('.ele-container'))"><i class="fas fa-trash"></i>Delete</li>
                        <li class="dropdown-item"  onclick="updateElementsGroups(${ele.id},${collection},'${type}-back',${collection},this.closest('.ele-container'))"><i class="fas fa-chevron-left"></i> Send Backword</li>
                        <li class="dropdown-item"  onclick="updateElementsGroups(${ele.id},0,'${type}',${collection},this.closest('.ele-container'))"><i class="fas fa-backward"></i> send to root Folder</li>
                     </ul>
                </div>
                <div class="image-container ${color}" title="${ele.last_modification}"  draggable="true" ondrop="drop(event)" ondragstart="drag(event)">
                    <a href=/diet/${type}/${ele.element_id}/${encodeURIComponent(ele.title)}>    
                        <img src="${img_path}" alt="${ele.title}">
                        <div class="gradient-overlay"></div>
                        <div class="image-details">
                            <h5 class="m-0 p-0">
                                ${favourite}
                                ${ele.title}
                            </h5>
                            <p class="m-0 p-0">${ele.creator}</p>
                            <p class="m-0 p-0">Created: ${ele.creation_date}</p>
                            <p class="m-0 p-0" >
                                ${description}
                            </p>
                        </div>
                    </a>
                </div>
        </div>
       `

}

let collectionTemp = (ele) => {
    return `<div class="ele-container" id=${ele.id} data-type="collection">
                <div class="dropdown" style="position:absolute;top:0; right:0;">
                   <span data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-ellipsis-v"></i>
                   </span>
                    <ul class="dropdown-menu">
                        <li class="dropdown-item" title="Rename" onclick="activeRenameInput(this.closest('.ele-container'))"><i class="fas fa-pencil-alt"></i>Rename</li>
                        <li class="dropdown-item" title="Edit" onclick="activeEditInput(this.closest('.ele-container'))" ><i class="fas fa-edit"></i>Edit</li>
                        <li class="dropdown-item"  onclick="deleteElement('collection',${ele.id},this.closest('.ele-container'))"><i class="fas fa-trash"></i>Delete</li>
                        <li class="dropdown-item"  onclick="updateElementsGroups(${ele.id},${collection},'collection-back',${collection},this.closest('.ele-container'))"><i class="fas fa-chevron-left"></i>&nbsp;Send Backword</li>
                        <li class="dropdown-item"  onclick="updateElementsGroups(${ele.id},0,'collection',${collection},this.closest('.ele-container'))"><i class="fas fa-backward"></i>&nbsp;send to root Folder</li>
                    </ul>
                </div>
                <div onclick="display_collection(${ele.id},this)" class="folder-container" draggable="true" ondrop="drop(event)" ondragstart="drag(event)" ondragover="event.preventDefault()" title="${ele.description}">
                    <i class="fas fa-folder folder"></i>
                    <textarea  onfocus="this.select()" onblur="EditDescription('collection',this,${ele.id})">${ele.description}</textarea>
                    <h5 class="m-0 p-0">
                     <input class="editable-title" value="${ele.title}" onfocus="this.select()" onblur="renameElement('collection',this,${ele.id})">
                    </h5>
                    <div class="gradient-overlay"></div>
                    <div class="image-details">                    
                        <p class="m-0 p-0">Created: ${formatDate(ele.creation_date)}</p>
                       <br>
                        <p class="m-0 p-0 ele-description">
                            ${ele.description}
                        </p>
                    </div>
                 </div>
            </div> 
           `
}


function load_elements(elements,type,collection){
    // reset th page     
    console.log(elements,'c',collection)
    let page = document.querySelector('.item_viewer');
    page.innerHTML ='';
    let colors = {'diet':'accent-color','exercies':'primary-color','full':'cover'}
    let color = 'diet';
    // load elements based on template
    //'favourite','plan__id'
   // for (i =0 ; i < 5 ; i++){
    console.log('eb',type,displayed);

    elements.forEach((ele) => {
        if(displayed <= size){
            if (ele.category || ele.type){
                if (isCollection)
                    type = (ele.type)?'plans':'recipes';
                page.innerHTML+=element_temp(ele,type);
                if(type == 'plans' || ele.type)
                    color = ele.type;    
                let container = page.lastElementChild;
                let gradientOverlay = container.querySelector('.gradient-overlay');
                gradientOverlay.style.background = `linear-gradient(to top, rgba(var(--${colors[color]}-rgb), 0.7), rgba(0, 0, 0, 0))`;
            }else
                page.innerHTML+=collectionTemp(ele,type);

            displayed++;

        }
       
   }); 
   console.log('ea',type,displayed);
}

function set_nav_btns(data){
    let prev = document.querySelector('#prev').parentElement;
    let next = document.querySelector('#next').parentElement
    let resizeListener;

    prev.style.display =(data.prev)?'':'none';
    next.style.display =(data.next || data.elements.length > size )?'':'none';
    if(!data.next && next.style.display == ''){
        if (!resizeListener) {
            resizeListener = () => {
                next.style.display = (get_size() >= data.elements.length) ? 'none' : '';
            };
            window.addEventListener('resize', resizeListener);
            }
        }else{
            if (resizeListener) {
                window.removeEventListener('resize', resizeListener);
                resizeListener = null;
            }
        }
}

function get_size(){
    const parentRect = document.querySelector('.item_viewer').getBoundingClientRect();
    let height = Math.floor((parentRect.height-90)/130) || 1;
    let width = (window.innerWidth <= 650)?2:
    (window.innerWidth <= 850)?3:
    (window.innerWidth <= 1300)?4:6;
   // console.log(width,height);
    return width*height
}

var dragged;
function drag(event){
    let target = event.target.closest('div.ele-container');
    console.log(target);

    dragged = target ;
    let icon = target.querySelector('i.folder');
    console.log(icon);
    let dragImage 
    if (icon){
        dragImage = document.createElement('div')
        dragImage.innerHTML = icon.outerHTML;
        dragImage.querySelector('i').style.fontSize ='50px';
        dragImage.querySelector('i').style.color ='rgb(var(--highlight-rgb))';      
    
    }else{
        dragImage = target.querySelector('.image-container').cloneNode(false);
        dragImage.style.width ='100px';
        dragImage.style.height ='100px';
    }
    dragImage.style.position ='absolute';
    dragImage.style.top ='-1000px';

    console.log(dragImage);

    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 50, 50);
    setTimeout(function() {
        document.body.removeChild(dragImage);
    }, 0);

}

function drop(event){
    event.preventDefault();
    let target = event.target.closest('div.ele-container') 
    console.log(target); 
    if (target && target !== dragged){
        //send to server and update the parent of dragged folder
        let eleType = dragged.dataset.type;
        console.log(collection,dragged.id,target.id)
        updateElementsGroups(dragged.id,target.id,eleType,collection,dragged)
        updateOnChange();
    }

}

function deleteElement(type,eleId,ele){
    console.log(ele);
    if (type =='collection')
        delete_from_server(
            `/diet/update_collections/delete/${eleId}`,
            () => {
                console.log("folder deleted successfully!");
                ele.remove();
            }
        )
    else
        delete_from_server(
            `/diet/edit_ele/${type}/${eleId}`,
            () => {
                console.log("folder deleted successfully!");
                ele.remove();
            }
        )
    updateOnChange();
} 

function updateOnChange(){
    displayed = 0;
    let anchor = viewer.children[0]
    console.log(anchor);
    get_elements(anchor.dataset.type,anchor.id,type='relode',collection)
}

let removeHover = (event) => {
    let ele = event.target.closest('.folder-container,.image-container');
    console.log(event.target,ele)
    if (ele && ele.classList.contains('edit-mode')){
        let input = ele.querySelector('textarea') 
        console.log(input,input &&  getComputedStyle(input).display === 'none')
        if(input && getComputedStyle(input).display == 'none'){
            ele.querySelector('H5').style.opacity = '1';
            ele.querySelector('H5').style.zIndex ='100';
        }else{
            ele.querySelector('H5').style.opacity = '0';
        }
        ele.querySelector('.image-details').style.opacity='0';

    }
}

let submitByEnter = event =>{
    let input=event.target 
    if (event.key === 'Enter')
        input.blur()
}
function activeRenameInput(ele){
    let input = ele.querySelector('INPUT'); 
    input.style.pointerEvents='auto';
    activeEditMode(input,ele)
}

function activeEditInput(ele){
    let input = ele.querySelector('textarea');
    input.style.display='block';
    activeEditMode(input,ele)
}

function activeEditMode(input,ele){
    input.focus()
    input.addEventListener('keydown',submitByEnter)
    let container = ele.querySelector('.folder-container, .image-container')
    container.classList.add('edit-mode')
    container.addEventListener('mouseover',removeHover)
}

function renameElement(type,title,eleId){
    if (type =='collection'){
        post_to_server(`/diet/update_collections/rename/${eleId}`,
        JSON.stringify({'title':title.value}),
        () => { 
            title.className = 'editable-title';
            exitEditMode(title)
            title.style.pointerEvents='none';
            title.style.left ='0';

        },
        () => { title.className = 'form-control is-invalid';title.style.left='17%'})
            
    }

}

function EditDescription(type,description,eleId){
    if (type =='collection'){
        post_to_server(`/diet/update_collections/edit/${eleId}`,
        JSON.stringify({'description':description.value}),
        () => {
            let display = description.parentElement.querySelector('.ele-description')
            display.innerHTML = description.value
            exitEditMode(description);
            description.style.display = 'none'
            description.parentElement.querySelector('H5').style.opacity = '1';; 
            description.parentElement.querySelector('.image-details').style.opacity = ''; 

        })
            
    }

}

function exitEditMode(input){
    let ele = input.closest('.folder-container, .image-container');
    ele.removeEventListener('mouseover',removeHover);
    ele.classList.remove('edit-mode')
    input.removeEventListener('keydown',submitByEnter)
}

function openAddEleForm(collection=0){
    get_from_server(`/diet/create_ele/${collection}`,undefined,(data) => {

    })
}

