let diet_plan;
let exercies_plan;
let currentIndex = 0;
let viewer;
let anchor;
let type;
let ele_id;
let dragEle;
let images = [];
let imageViewerMode=false;

function assignConstants(url){
    type = (url.includes('plan'))?'plans':'recpies';
    match = url.match(/(?:plans|recipes)\/(\d+)/);
    ele_id = match ? match[1] : null;

    viewer = document.querySelector('.item_viewer'); 
    viewer.addEventListener('scroll',checkAnchor);
    anchor = document.querySelector('#info-page');
    console.log(url);
    
    diet_plan = document.querySelector('#diet_plan');
    exercies_plan = document.querySelector('#exercies_plan');
    
}

function set_page(){
    const url = window.location.pathname;
    assignConstants(url);

    post_to_server(url,{},(data) =>{
        load_details(data.details,type);
        fill_contents(data.details,type);
        process_data(data.dates);
        console.log(data);
        let formated_info =`
            <li><b>Created:</b> ${data.dates.creation_date}</li>
            <li><b>Edited:</b> ${data.dates.last_modification}</li>
        ` 
        if (type == 'plans')
            formated_info =`<li><b>duration:</b> ${data.dates.duration}<input type='number' class='hiddenNum' onchange="updateDuration(event)" value=${+data.dates.duration.split(' ')[0]} min="0"></li>` +formated_info 
        document.querySelector('.plan-info ul').innerHTML+=formated_info
        if (diet_plan)
            diet_plan.querySelector('ul').innerHTML+=formated_info
        if (exercies_plan)
            exercies_plan.querySelector('ul').innerHTML+=formated_info 
        
        toggelNavBtn();
        submitByEnter();
                     
        let goal = document.querySelector('#ele-goal');
        if (goal && goal.textContent.trim() == '' && data.dates.creation_date == 'Just now')
            goal.focus();
        images = data.media;
               
        const imgBtns = document.querySelector('.img-btns');
        imgBtns.addEventListener('click',(e) => {
            if (e.target.tagName === 'I'){
                switch(e.target.dataset.action){
                    case 'expand':
                        expandMediaViewer(data.media);
                    break;
                    case 'upload':
                        let input = document.querySelector('#img_upload');
                        input.addEventListener('change',uploadMedia)
                        input.click();
                    break
                    case 'link':
                        let linkInput =document.querySelector('#media_link');
                        let img = linkInput.closest('.img-container').querySelector('img');
                        const regex = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|svg))$|^data:image\/(jpeg|png|gif|bmp|svg)\;base64,.+/i;

                        linkInput.classList.remove('d-none');
                        linkInput.focus()
                        linkInput.onblur = () => {
                            linkInput.classList.add('d-none');
                            let img_link = linkInput.value; 
                            console.log(img_link);
                            if(!regex.test(img_link)){
                                console.log('invalid')
                                return
                            }
                            linkInput.value ='';
                            patch_to_server(`/diet/edit_img_list/${ele_id}`,JSON.stringify({
                                'img_src':img_link,
                                 'type':type,
                            }),() => {
                                if (!images.includes(img_link))
                                    images.push(img_link);
                                let index = images.indexOf(img_link)
                                img.dataset.index = index;
                                img.src =  img_link;
                            })
                        }

                    break
                }
            } 
                console.log(e.target)
        })
        cycleImage(images);
    })
   
    const select = document.querySelector('#groupEditor');
    const addBtn = select.previousElementSibling;
    select.addEventListener('blur' ,() =>{toggel_elements([select,addBtn])});
    addBtn.addEventListener('click', () =>{toggel_elements([select,addBtn])});
    
   
}

function expandMediaViewer(images){
    let media_viewer = document.querySelector(".media_viewer");
    let detail = document.querySelector("#details");
    let info = document.querySelector("#info-page");
    let anchor = document.querySelector("#anchor");
    let closeBtn = document.querySelector('#closeMediaViewer');
    toggel_elements([media_viewer,detail,info,anchor,closeBtn])
    toggelNavBtn();
    media_viewer.innerHTML ='';

    console.log(images);
    for (let img of images){
        let img_src = (img.includes(`${type}_images`))?`/media/${img}`:img;
        media_viewer.innerHTML+= `<div class="viewer-img" onclick="expandImages()" draggable ondragstart="startDragImg(event)" ondragend="endDragImg()">
                                    <img src="${img_src}">
                                </div>`
    }

}

function uploadMedia(event){
    let input = event.target;                    
    if (!validate_img(input.files[0]))
        return   
        const formData = new FormData();
        formData.append('img', input.files[0]);
        formData.append('type', type);
        let title_element = input.closest('.base-info').previousElementSibling;
        let title = ( title_element.tagName == 'H3' )?title_element.textContent:document.querySelector('#info-page h1').textContent;
        formData.append('title', title);
        post_to_server(`/diet/edit_img_list/${ele_id}`,formData,
                        (data) => {
                            let img = input.closest('.img-container').querySelector('img');
                            if (!data.exist){
                                images.push(data.image_url);
                                img.dataset.index = images.length - 1
                                img.src = MediaUrl + data.image_url.trim();
                            }else{
                                let index = images.indexOf(data.image_url)
                                img.dataset.index = index
                                img.src = MediaUrl + images[index];
                            }                                    
                        })                        
}

function startDragImg(event){
   
        event.stopPropagation(); 
        dragEle = event.target.closest('.viewer-img');
        console.log(dragEle)
        let btn = document.querySelector('#deletbtn');
        btn.style.opacity = '0.8';
}

function endDragImg(){
    
    let btn = document.querySelector('#deletbtn')
    btn.style.opacity = '0';

}
function restViewer(){
    if(document.querySelector('.media_viewer .viewer-img').classList.contains('expand')){
        viewer.classList.remove('p-0');
        viewer.style.columnCount="";
        viewer.style.position="";
        imageViewerMode=false;
        document.querySelector(".vertical-line").style.display ='';
        document.querySelectorAll('.viewer-img').forEach((img) => {
            img.classList.remove('expand');
        });
        toggelNavBtn()
    }else{
        let media_viewer = document.querySelector(".media_viewer");
        let detail = document.querySelector("#details");
        let info = document.querySelector("#info-page");
        let anchor = document.querySelector("#anchor");
        let closeBtn = document.querySelector('#closeMediaViewer');
        toggel_elements([media_viewer,detail,info,anchor,closeBtn])
        toggelNavBtn();
        media_viewer.innerHTML ='';
    }

}
function expandImages(){
    viewer.classList.add('p-0');
    viewer.style.columnCount="1";
    viewer.style.position="relative";
    imageViewerMode=true
    document.querySelector(".vertical-line").style.display ='none';
    document.querySelectorAll('.viewer-img').forEach((img) => {
        img.classList.add('expand');
    });
    toggelNavBtn()
    
}
function submitByEnter(){
    let divs = document.querySelectorAll('div[contenteditable]');
    divs.forEach( div =>{
        div.addEventListener('keydown',(event) => {
            if (event.key === 'Enter') {
                if (event.shiftKey) {
                    event.preventDefault(); 
                    div.execCommand('insertText', false, '\n');
                } else {
                    event.preventDefault(); 
                    div.blur();
                }
            }
        })
    })
}

function updateTitle(event){
    const input = event.target
    let org_title = input.textContent
    console.log(`diet/edit_ele/${type}/${ele_id}`,input,input.innerHTML,input.textContent)
    if(input.textContent =='')
        input.textContent = org_title;
    patch_to_server(`/diet/edit_ele/${type}/${ele_id}`,
                    JSON.stringify({'title':input.textContent}),
                    () => {input.classList.remove('invalid')},
                    () => {
                        input.classList.add('invalid');
                        input.focus()
                    }
                )
}

function updateGoal(event){
    const input = event.target
    let org_text = input.textContent
    if(input.textContent =='')
        input.textContent = org_text;
    console.log(input.textContent);
    patch_to_server(`/diet/edit_ele/${type}/${ele_id}`,JSON.stringify({'goal':input.textContent}),()=>{})
}

function updateDuration(event){
    const input = event.target
    console.log(input);
    patch_to_server(`/diet/edit_ele/${type}/${ele_id}`,
                    JSON.stringify({'duration':input.value*24*60}),
                    () => {
                        let text = input.previousSibling;
                        console.log(`P${input.value}D00H:00M:00S`)
                        text.textContent=formatDuration(`P${input.value}D00H:00M:00S`)
                    }
                   
                )
}

function updateServing(event){
    const input = event.target
    console.log(input);
    patch_to_server(`/diet/edit_ele/${type}/${ele_id}`,
                    JSON.stringify({'serv':input.value}),
                    () => {}
                )
}

function updatePrepTime(event,hours){
    const input = event.target
    console.log(input);
    let value;
    if (hours){
        let min = input.nextElementSibling.nextElementSibling.value
        value = +input.value * 60 + +min;
        console.log(min)
    }else{
        let hours = input.previousElementSibling.previousElementSibling.value
        value = +hours * 60 + +input.value;
        console.log(hours)
    }
    console.log(value);
    patch_to_server(`/diet/edit_ele/${type}/${ele_id}`,
        JSON.stringify({'prep_time':value}),
        () => {}
       
    )
}

function resize_page(){
    if (anchor && viewer){
        console.log(anchor);
        viewer.scrollLeft = anchor.offsetLeft - 40;
        toggelNavBtn();

        
    }
}

function checkAnchor(){
    let closestItem = null;
    let minDistance = Infinity; 
    let items = Array.from(document.querySelectorAll('.section'));
    items.push(document.querySelector('#info-page'))
    items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const containerRect = viewer.getBoundingClientRect();

        const distance = rect.left - containerRect.left;

        if (distance >= 0 && distance <= viewer.clientHeight) {
            if (Math.abs(distance) < Math.abs(minDistance)) {
                closestItem = item;
                minDistance = distance;
            }
        }
    });

    if (closestItem) {
        anchor = closestItem;
        const selectElement = document.querySelector('#anchor-select');
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === anchor.id) {
                selectElement.selectedIndex = i;
                break;
            }
        }

    }
    console.log(closestItem);
    toggelNavBtn();

    
}

function toggelNavBtn(){
    let prevBtn = document.querySelector('#prev').parentElement;
    let nextBtn = document.querySelector('#next').parentElement;
    if (viewer.scrollLeft/10 == 0)
        prevBtn.classList.add('d-none');
    else
        prevBtn.classList.remove('d-none');
    if (Math.ceil((viewer.scrollLeft + Math.floor(viewer.offsetWidth))/10) >= Math.ceil(viewer.scrollWidth/10))
        nextBtn.classList.add('d-none');
    else
        nextBtn.classList.remove('d-none');
    console.log(Math.ceil((viewer.scrollLeft + Math.floor(viewer.offsetWidth))/10) , Math.ceil(viewer.scrollWidth/10))
    console.log(viewer.scrollLeft/10)
}   

function navtPages(direction){
    viewer.style.overflowX ='scroll';
    let ele = document.querySelector('.item_viewer');
    let width = Math.floor(ele.offsetWidth);
    let end =  Math.ceil(ele.scrollWidth)
    let move = (imageViewerMode)? [42,100]:[-40,12]
    if (window.innerWidth <= 850)
        ele.scrollLeft += direction * (width + move[0]);
    else
        ele.scrollLeft += direction * (width + move[1]);
    setTimeout(
        () => {
            viewer.style.overflowX ='hidden';

            console.log(ele.scrollLeft ,Math.ceil(ele.scrollLeft + width), width ,end)   
            
        },600
    )
    
}
function scrollToSetion(id){
    anchor = document.querySelector(`#${id}`);
    console.log(anchor);
    viewer.scrollLeft = anchor.offsetLeft - 40;
    toggelNavBtn();
}

function editSection(details_area){
    let details = details_area.innerHTML
    let input = document.createElement('textarea');
    input.value = details
    input.classList.add('editableDiv');
    input.focus()
    input.onblur = () =>{
        disableEditSection(input);
    }
    details_area.innerHTML='';
    details_area.append(input);
}

function disableEditSection(input){
    let details_area = input.parentElement
    console.log(input.value,details_area)
    details_area.innerHTML=input.value;
}
function load_details(data,type,parent){
    const details =(parent)?parent:document.querySelector('#details');
    for (let i = 0; i <data.length; i++){
        console.log(data[i]);
        if (data[i].section == 'diet_plan' || data[i].section == 'exercies_plan'){
            fill_sub_plan_data(data[i].details);
        }else{
            let section = document.createElement('div');
            section.classList.add('section');
            section.id = `section${data[i].id}`;
            section.draggable = true;
            section.setAttribute('data-order', data[i].order);
            
            section.innerHTML = section_temp(data[i]);

            let detail = section.querySelector('.detail');
            let addbtn = section.querySelector('.addBtn');
            console.log(detail,addbtn)
            if (data[i].section == 'Ingredients'){
                let ingredients =document.createElement('ul');
                ingredients.className = 'detail pl-5 py-2'
                data[i].details.forEach(ele => {
                    ingredients.innerHTML += `<li>${ele}</li>`;    
                });
                section.replaceChild(ingredients,detail);
                section.removeChild(addbtn) 
            }else{
                let sub_section = section.children[2];
                if (data[i].sub_sections.length > 0){
                    console.log(data[i].sub_sections)
                    load_details(data[i].sub_sections,type,sub_section);
                }
                
                section.ondragstart = (event) => {
                    event.stopPropagation(); 
                    dragEle = section;
                    section.querySelector('i').style.display='none';
                    let btn = document.querySelector('#deletbtn')
                    btn.style.opacity = '0.8';
                    let eles  = section.children;
                    section.querySelector('input').blur();
                    console.log(eles);
                    for (let i =1;i < eles.length;i++){
                        eles[i].style.display = 'none';
                    }
                }
                section.ondragend = () => {
                    dragEle ='';
                    let eles  = section.children;
                    section.querySelector('i').style.display='';
                    let btn = document.querySelector('#deletbtn')
                    btn.style.opacity = '0';
                    for (let i =1; i < eles.length;i++){
                        eles[i].style.display = '';
                    }
                }

                addbtn.addEventListener('dragover', (event) => {
                    event.preventDefault(); 
                    addbtn.style.opacity = '0.8';
                    addbtn.style.height = '25px'; 
                });
            
                addbtn.addEventListener('dragleave', () => {
                    addbtn.style.opacity = ''; 
                    addbtn.style.height = ''; 
                });
            }
            details.append(section);
        }
    }
}

let section_temp = (ele) => `
    <span style="position:relative" ondragover="event.preventDefault()" ondrop="reorderElements(this.closest('.section').children[2],this.closest('.section'));">
        <i class="fas fa-plus add-btn" onclick="createSection(this.closest('.section'),'parent')" ></i>
        <input class="header display-input" type="text" value="${ele.section}:"
        onlclick="console.log('dbclick');console.log('foucus');"
        onblur="renameSection(this,${ele.id})",
        onkeydown="this.style.border='none'">
    </span>
    <span class='detail' ondblclick="editSection(this)">${ele.details}</span>
    <span></span>
    <div class="addBtn sec-btn" 
        onclick="createSection(this.closest('.section'),'sibling')"
        ondrop="reorderElements(this,this.closest('.section'));"
        >+</div>
`
function createSection(anchor,relation){
    let ref_ele =(relation == 'sibling')?anchor.parentElement.closest('.section'):anchor;
    console.log(ref_ele);
    let parent_id = (ref_ele)?ref_ele.id.replace('section',''):0;
    let parent_ele,sibling_ele;
    if (relation == 'sibling'){
        parent_ele = ref_ele;
        sibling_ele = anchor;
    }else{
        parent_ele = anchor;
        sibling_ele = null;
    }
    let order = setAndUpdateOrder(parent_ele,sibling_ele);
    post_to_server(`/diet/edit_sec/${ele_id}`,
                    JSON.stringify({'parent_id':parent_id,'order':order}),
                    (data) =>{
                        post_to_server(window.location.pathname,{},(fulldata) =>{fill_contents(fulldata.details,type)})
                        let section = document.createElement('div');
                        section.classList.add('section');
                        section.id = `section${data.data.id}`;
                        section.draggable = true;
                        section.setAttribute('data-order', data.data.order);
                        section.innerHTML = section_temp(data.data);
                        let addbtn = section.children[3];

                        section.ondragstart = (event) => {
                            event.stopPropagation(); 
                            dragEle = section;
                            section.querySelector('i').style.display='none';
                            let btn = document.querySelector('#deletbtn')
                            btn.style.opacity = '0.8';
                            let eles  = section.children;
                            section.querySelector('input').blur();
                            console.log(eles);
                            for (let i =1;i < eles.length;i++){
                                eles[i].style.display = 'none';
                            }
                        }
                        section.ondragend = () => {
                            dragEle ='';
                            let eles  = section.children;
                            section.querySelector('i').style.display='';
                            let btn = document.querySelector('#deletbtn')
                            btn.style.opacity = '0';
                            for (let i =1; i < eles.length;i++){
                                eles[i].style.display = '';
                            }
                        }

                        addbtn.addEventListener('dragover', (event) => {
                            event.preventDefault(); 
                            addbtn.style.opacity = '0.8';
                            addbtn.style.height = '25px'; 
                        });
                    
                        addbtn.addEventListener('dragleave', () => {
                            addbtn.style.opacity = ''; 
                            addbtn.style.height = ''; 
                        });
                        if (relation === 'parent')
                            anchor.children[2].insertBefore(section, anchor.querySelector('.section'));
                        else
                            anchor.parentElement.insertBefore(section,anchor.nextElementSibling); 
                        section.querySelector('.header').focus();
                    }
    )

}

function reorderElements(anchor,section){
    console.log(section)
    let ref_ele = (anchor.tagName =='DIV')?anchor.closest('.section'):anchor;
    anchor.style.opacity = ''; 
    anchor.style.height = ''; 
    let position = (anchor.tagName =='DIV')?'afterend':'afterbegin';
    ref_ele.insertAdjacentElement(position, dragEle);
    let new_parent = ref_ele.parentElement.closest('.section');
    let orders = setAndUpdateOrder(new_parent,section,dragEle,true);
    console.log(orders);
    patch_to_server(`/diet/edit_sec/${dragEle.id.replace('section','')}`,
        JSON.stringify({'parent_section':new_parent.id.replace('section',''),'orders':orders}),
        () => {})
   
}

function setAndUpdateOrder(parent_ele,ref_ele,ele,all=false){
    let children = parent_ele.querySelectorAll(':scope > span >.section');
    let order,found=false;
    console.log(children);
    let orders = [];

    if (!ref_ele){
        order = (children.length > 0)?+children[0].dataset.order - 1:1;
    }else{
        children.forEach((sec,i) => {
            if(all){ 
                orders.push({'id':sec.id.replace('section',''),'order':i});
                sec.dataset.order = i;
                console.log(sec); 
            }else{
                if (sec === ref_ele){
                    found = true;
                    order = +sec.dataset.order + 1
                }else if(found) {
                    sec.dataset.order = +sec.dataset.order + 1; 
                }
            }            
        });
        if (ele && order && !all)
            ele.dataset.order = order; 
   
    }
    console.log(parent_ele,ref_ele,order)
    if (all)
        return orders;
    return order;
    
}

function deletSection(){
    if (dragEle.className == 'viewer-img'){
        let ele_src = dragEle.querySelector('img').src;
        let img_src =(ele_src.includes(`${type}_images`))?ele_src.split('/media/')[1]:ele_src;
        patch_to_server(`/diet/edit_img_list/${ele_id}`,JSON.stringify({
            'img_src':img_src,
             'type':type,
             'delete':true
        }),() => {
            let index = images.indexOf(img_src);
            console.log(images,img_src);
            images.splice(index, 1);
            console.log(images,img_src);

            dragEle.remove();
        })
    }else{
        let id = dragEle.id.replace('section','');
        console.log(id);
        delete_from_server(`/diet/edit_sec/${id}`,() => {
            document.querySelector(`#section${id}`).remove();
            let regex = document.querySelector(`option[value="section${id}"]`).textContent.replace(/ /g,'');
            console.log(regex,new RegExp(`^${regex}(>.*)?`));
            let selectElement =document.querySelector('#anchor-select');
            Array.from(selectElement.options).forEach(opt => {
                console.log(opt.textContent.replace(/ /g,''),opt.textContent.replace(/ /g,'').match(new RegExp(`^${regex}(>.*)?`)));
                if (opt.textContent.replace(/ /g,'').match(new RegExp(`^${regex}(>.*)?`))){
                    opt.remove();
                }
            })
            document.querySelector(`a[href="#section${id}"]`).parentElement.remove();
        });
    }
    
}

function renameSection(header,section_id){
    if (dragEle){
        return;
    }
    console.log('touched');
    let section = header.value.replace(':','').trim() 
    if (section == ''){
        header.style.border='1px solid #f00';
        header.focus();
        return;
    }
    let otherSubSections = header.closest('.section').parentElement.querySelectorAll('div > .section > span > .header');
    console.log(otherSubSections); 
    otherSubSections.forEach(sec =>{
        if(sec !== header && sec.value.replace(':','').trim() === section){
            header.style.border='1px solid #f00';
            header.focus();
            return;
        }
    });
    patch_to_server(`/diet/edit_sec/${section_id}`,
        JSON.stringify({'section':`${section}`}),
        () => {
                document.querySelector(`a[href="#section${section_id}"]`).textContent = section;
                document.querySelector(`option[value="section${section_id}"]`).textContent = document.querySelector(`option[value="section${section_id}"]`).textContent.trim().replace(/>([^>]+)$/, `> ${section}`);
        }
    )

}
function fill_contents(data,type,parent,suffix=''){
    const index =(parent)?parent:document.querySelector('#index ul');
    const navAnchor = document.querySelector('#anchor-select');
    if(!parent){
        index.innerHTML ='';
        navAnchor.innerHTML = '';
    }
    for (let i = 0; i <data.length; i++){
        let option = document.createElement('option');
        option.value = `section${data[i].id}`;
        option.textContent = `${suffix} ${data[i].section}`;
        navAnchor.append(option)
        let title = document.createElement('li');
        title.innerHTML =`<a href="#section${data[i].id}">${data[i].section}</a>` 
        if (data[i].sub_sections.length>0){
            nextSuffix = suffix + `${data[i].section} >`
            let section = document.createElement('ul');
            fill_contents(data[i].sub_sections,type,section,nextSuffix);
            title.append(section);
        }
        index.append(title);
        
    }
}

function fill_sub_plan_data(data){
   process_data(data);
   const info_card = document.querySelector(`#${data.plan_type}_plan`) 
   info_card.querySelector('h3 input').innerHTML = `${data.title}`;
   if (data.media)
    info_card.querySelector('img').src = `/media/${data.media[0]}`;
   let info = info_card.querySelectorAll('li');
   info[0].querySelector('span').innerHTML= `${data.username}`
   info[2].querySelector('div').innerHTML= `${data.goal}`
   let formated_info =`
        <li><b>duration:</b> ${data.duration}<input type='number' class='hiddenNum' onchange="updateDuration(event)" value=${+data.duration.split(' ')[0]} min="0"></li>
        <li><b>Created:</b> ${data.creation_date}</li>
        <li><b>Edited:</b> ${data.last_modification}</li>
    ` 
   info[0].parentElement.innerHTML+=formated_info
   if (data.plan_type == 'diet')
        diet_plan ='';
    else         
        exercies_plan ='';         

}

function cycleImage(images) {
    const imgElement = document.querySelector('img');

    const updateImage = (direction) => {
        if (images){
            let currentIndex = parseInt(imgElement.getAttribute('data-index'));

        if (direction === 'next') {
            currentIndex = (currentIndex + 1) % images.length; // Increment for next
        } else if (direction === 'prev') {
            currentIndex = (currentIndex === 0) ? images.length - 1 : (currentIndex - 1) % images.length; // Decrement for prev
        }

        imgElement.setAttribute('data-index', currentIndex);
        if (images[currentIndex].includes(`${type}_images`))
            imgElement.src = MediaUrl + images[currentIndex];
        else
            imgElement.src = images[currentIndex]
        }
        
    };

    document.querySelector('#img_next').parentElement.addEventListener('click', (event) => {
        console.log('Next image clicked');
        updateImage('next');
    });

    document.querySelector('#img_prev').parentElement.addEventListener('click', (event) => {
        console.log('Previous image clicked');
        updateImage('prev');
    });
}

