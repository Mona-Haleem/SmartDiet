class Viewer {
    constructor(data,type,details){
        this.viewer =  document.querySelector('.item_viewer');
        this.navBtns = document.querySelectorAll('.nav-btn')
        this.type = type
        this.element = (type =='plans')? new Plan(data,type,details,this):new Recipe(data,type,details,this);
        this.anchor =  document.querySelector('#info-page');
        this.anchorLeft =this.anchor.getBoundingClientRect().left
        this.viewerScroll=this.viewer.scrollLeft;
        this.dragEle = null;
        this.imageViewerMode=false;
        this.currentMedia = 0;
        this.mediaEle=this.element;
        this.loadData();
        this.addEventsHandelers();
    }

    loadData(){
        this.viewer.querySelector('.groups').insertAdjacentElement('afterend', this.element.eleBrief);
        this.element.updateIndex();
        this.element.fillDetails(); 
        this.toggelNavBtn();       
    }

    addEventsHandelers(){
        this.navBtns[0].addEventListener('click',() => this.navtoPage(-1));
        this.navBtns[1].addEventListener('click',() => this.navtoPage(1));
        this.viewer.addEventListener('scroll',this.checkAnchor);
        this.viewer.querySelector('#index').addEventListener('click',(event)=>{
            if(event.target.tagName == 'A'){
                event.preventDefault()
                console.log(event.target.hash.slice(1))
                let eleID = event.target.hash.slice(1);
                if (eleID)
                    scrollToSetion(eleID);
                else
                    toggel_elements([event.target.nextElementSibling])
                event.stopPropagation();
            }else if(event.target.tagName == 'LI' && event.clientX - event.target.getBoundingClientRect().left < 0){
                toggel_elements([event.target.querySelector('ul')]);
            }

        })

        const deleteBtn = this.viewer.querySelector('#deletbtn');
        deleteBtn.addEventListener('drop',()=>{
            if (this.dragEle.className == 'viewer-img')
                this.mediaEle.deleteMedia();
            else
                this.dragEle.deleteSection();
        }) 
        this.handelImagesInteractions();
        this.viewer.querySelector('#ele-title').addEventListener('blur',this.element.updateTitle);
        if(this.type =='plans'){
            this.handelPlanDataInteractions();
            if (this.element.planType == 'full'){
                this.handelImagesInteractions(this.element.dietPlan);
                this.handelImagesInteractions(this.element.exerciesPlan);
                this.handelPlanDataInteractions(this.element.dietPlan);
                this.handelPlanDataInteractions(this.element.exerciesPlan);
            }
        }else
            this.handelRecipeDataInteractions();
        submitByEnter();
    }

    handelImagesInteractions(element = this.element){
        const uploadInput = element.img.element.querySelector('input[type="file"]');
        const linkInput = element.img.element.querySelector('input[type="text"]');     
        const imgBtns = element.img.element.querySelector('.img-btns');
        const closeBtn = document.querySelector('#closeMediaViewer');
        closeBtn.addEventListener('click',this.restViewer);
        uploadInput.addEventListener('change',element.uploadImage);
        linkInput.addEventListener('blur',element.uploadMediaLink);
        imgBtns.addEventListener('click',(e) => {
                if (e.target.tagName === 'I'){
                    switch(e.target.dataset.action){
                        case 'expand':
                            element.img.expandMediaViewer(viewer,element);
                        break;
                        case 'upload':
                            uploadInput.click();
                        break
                        case 'link':
                            linkInput.classList.remove('d-none');
                            linkInput.focus()    
                        break
                     }
                 } 
            })
    }
    
    handelPlanDataInteractions(element = this.element){
        const goal = element.info.element.querySelector('li div');
        const duration  = element.info.element.querySelector('li input');
        goal.addEventListener('blur',element.updateGoal);
        duration.addEventListener('change',element.updateDuration);
    }
    
    handelRecipeDataInteractions(){
        const inputs =  this.element.info.element.querySelectorAll('li input');
        inputs[0].addEventListener('change',this.element.updateServing);
        inputs[1].addEventListener('change',this.element.updatePrepTime);
        inputs[2].addEventListener('change',this.element.updatePrepTime);
    }

    navtoPage(direction){
        this.viewer.style.overflowX ='scroll';
        let width = Math.floor(this.viewer.offsetWidth);
        let end =  Math.ceil(this.viewer.scrollWidth);
        let move = (this.imageViewerMode)? [42,100]:[-40,12]
        if (window.innerWidth <= 850)
            this.viewer.scrollLeft += direction * (width + move[0]);
        else
            this.viewer.scrollLeft += direction * (width + move[1]);
        this.toggelNavBtn();
        if (this.imageViewerMode)
            this.currentMedia += direction
        setTimeout(
            () => {
                this.viewer.style.overflowX ='hidden';
                console.log(this.viewer.scrollLeft ,Math.ceil(this.viewer.scrollLeft + width), width ,end)   
            },500
        )
    }

    checkAnchor=()=>{
        console.log('in');
        let closestItem = null;
        let minDistance = Infinity; 
        let items = Array.from(document.querySelectorAll('.section'));
        items.push(document.querySelector('#info-page'))
        if(this.element.planType == 'full'){
            items.push(document.querySelector('#diet_plan'));
            items.push(document.querySelector('#exercies_plan'))
            console.log(document.querySelector('#diet_plan'),document.querySelector('#exercies_plan'))
        }
        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            const containerRect = this.viewer.getBoundingClientRect();
            const distance = rect.left - containerRect.left;
            if (distance >= 0 && distance <= this.viewer.clientHeight) {
                if (Math.abs(distance) < Math.abs(minDistance)) {
                    closestItem = item;
                    minDistance = distance;
               }
           }
        });
        if (closestItem && closestItem != this.anchor) {
           this.anchor = closestItem;
           this.anchorLeft =this.anchor.getBoundingClientRect().left
           this.viewerScroll=this.viewer.scrollLeft;
           const selectElement = document.querySelector('#anchor-select');
           for (let i = 0; i < selectElement.options.length; i++) {
                if (selectElement.options[i].value === this.anchor.id) {
                    selectElement.selectedIndex = i;
                    break;
               }
            }
        }
       console.log(closestItem);
       this.toggelNavBtn();
    }

    toggelNavBtn(){
        let prevBtn = document.querySelector('#prev').parentElement;
        let nextBtn = document.querySelector('#next').parentElement;
        if (this.viewer.scrollLeft/10 == 0)
            prevBtn.classList.add('d-none');
        else
            prevBtn.classList.remove('d-none');
        if (Math.ceil((this.viewer.scrollLeft + Math.floor(this.viewer.offsetWidth))/10) >= Math.ceil(this.viewer.scrollWidth/10))
            nextBtn.classList.add('d-none');
        else
            nextBtn.classList.remove('d-none');
        console.log(Math.ceil((this.viewer.scrollLeft + Math.floor(this.viewer.offsetWidth))/10) , Math.ceil(this.viewer.scrollWidth/10))
        console.log(this.viewer.scrollLeft/10)
    }


    displayImg(img_src){
        let imgContainer = document.createElement('div');
        imgContainer.classList.add('viewer-img')
        imgContainer.draggable = true;
        imgContainer.addEventListener('click',this.expandImages)
        imgContainer.addEventListener('dragstart',(e)=>this.openDragMode(e,'.viewer-img'))
        imgContainer.addEventListener('dragend',this.endDragMode)
        imgContainer.innerHTML+= `<img src="${img_src}">`
        return imgContainer;
    }

    expandImages= (e)=>{
        
        this.viewer.classList.add('full-image');
        this.imageViewerMode=true
        document.querySelector(".vertical-line").style.display ='none';
        document.querySelectorAll('.viewer-img').forEach((img) => {
                img.classList.add('expand');
        });
        if(e.target.tagName == 'IMG')
            {let i = 0;
            while(e.target.src.replace(/.+\/media\//,'') != this.mediaEle.img.media[this.currentMedia] && i < 20)
                {
            console.log(e.target.src.replace(/.+\/media\//,'') , this.mediaEle.img.media[this.currentMedia],this.currentMedia)
                    i++;
                   this.navtoPage(1);
                }}
        this.toggelNavBtn()
    }

    restViewer=()=>{
        let image = document.querySelector('.media_viewer .viewer-img') 
        if(image && image.classList.contains('expand')){
            this.viewer.classList.remove('full-image');
            this.imageViewerMode=false;
            document.querySelector(".vertical-line").style.display ='';
            document.querySelectorAll('.viewer-img').forEach((img) => {
                img.classList.remove('expand');
            });            
        }else{
            let elements = [];
            const media_viewer=document.querySelector(".media_viewer")
            elements.push(media_viewer);
            elements.push(document.querySelector("#details"));
            elements.push(document.querySelector("#info-page"));
            elements.push(document.querySelector("#anchor"));
            elements.push(document.querySelector('#closeMediaViewer'));
            if (this.element.planType == 'full'){
                elements.push(...document.querySelectorAll('#diet_plan,#diet_plan+.base-info'));
                elements.push(...document.querySelectorAll('#exercies_plan,#exercies_plan+.base-info'));
            }
            toggel_elements(elements);
            media_viewer.innerHTML ='';
        }
        this.toggelNavBtn()
    }
   
    openDragMode(event,selector,element){
        event.stopPropagation(); 
        if(!element)
            element = event.target.closest(selector);
        this.dragEle = element;
        console.log(this.dragEle)
        let btn = document.querySelector('#deletbtn');
        btn.style.opacity = '0.8';
    }

    endDragMode= ()=>{
        let btn = document.querySelector('#deletbtn')
        btn.style.opacity = '0';
    }
    
}


class UserElement{
    constructor(type,data,details,viewer){
        if (new.target.name === 'Element')
            throw new Error("can't create objects of abstract class")
        process_data(data);
        this.viewer = viewer;
        this.eleType = type;
        this.id = data.id;
        this.user = data.user;
        this.title = data.title;
        this.details = details
        this.modefied = data.last_modification;
        this.created = data.creation_date;
        console.log(data,this.user)
    }

    createElement(media){
        this.img = new EleMedia(media);
        this.info = new EleInfoPreview(this.getInfoTemplate());
        this.eleBrief = document.createElement('div')
        this.eleBrief.classList.add('base-info');
        this.eleBrief.append(this.img.element,this.info.element);
    }

    updateTitle = (event)=>{
        const input = event.target;
        let newValue = input.value.trim();
        console.log(`diet/edit_ele/${this.eleType}/${this.id}`,input,'00000000',input.value)
        if(input.value ==''){
            input.value = this.title;
            return
        }     
        patch_to_server(`/diet/edit_ele/${this.eleType}/${this.id}`,
                    JSON.stringify({'title':input.value}),
                    () => {
                        input.classList.remove('invalid');
                        this.title = input.value;
                    },
                    () => {
                        if(this.viewer.element.planType == 'full')
                            this.changePlane(this.planType,newValue);
                        else{
                            input.classList.add('invalid');
                            input.focus()                  
                        }
                    }
                )
    }
    
    changePlane(planType,planTitle){
        patch_to_server(`/diet/edit_linked_plans/${this.viewer.element.id}`,
            JSON.stringify({'type':planType,'title':planTitle}),
            (data) => {
                console.log(data);
                this.details = data.details
                document.querySelector('#details').innerHTML ='';
                document.querySelector('#diet_plan + .base-info').remove();
                document.querySelector('#exercies_plan + .base-info').remove();
                this.updateIndex();
                this.displayLinkedPlans(); 
            },
            () => {}
        )

        //remove displayed data .base-info ,details
        //rerender the info and sections (display linked Plans)
    }

    uploadMediaLink = (event)=>{
        //get input link
        let linkInput = event.target;
        let img_link = linkInput.value; 
        //reset input
        linkInput.classList.add('d-none');
        linkInput.value ='';
        //validate link
        const regex = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|svg))$|^data:image\/(jpeg|png|gif|bmp|svg)\;base64,.+/i;
        if(!regex.test(img_link)){
            console.log('invalid')
            return
        }
        //send to server
        patch_to_server(`/diet/edit_img_list/${this.id}`,JSON.stringify({
                                'img_src':img_link,
                                'type':this.eleType,
                            }),
                            () => this.img.updatMedia(img_link)
                        )
    }

    uploadImage = (event)=>{
        let input = event.target;                    
        if (!validate_img(input.files[0]))
             return   
        const formData = new FormData();
        formData.append('img', input.files[0]);
        formData.append('type', this.eleType);
        formData.append('title', this.title);
        post_to_server(`/diet/edit_img_list/${this.id}`,formData,(data) => this.img.updatMedia(data.image_url)) 
    }

    deleteMedia(){
        let ele_src = this.viewer.dragEle.querySelector('img').src;
        let img_src =(ele_src.includes(`${this.eleType}_images`))?ele_src.split('/media/')[1]:ele_src;
        patch_to_server(`/diet/edit_img_list/${this.id}`,JSON.stringify({
            'img_src':img_src,
            'type':this.type,
            'delete':true,
        }),() => {
            let index = this.img.media.indexOf(img_src);
            console.log(this.img.media,img_src);
            this.img.media.splice(index, 1);
            console.log(this.img.media,img_src);
            this.viewer.dragEle.remove();
            if(this.img.media.length >= 1)
                this.img.cycleMedia(1);
            else
                this.img.element.querySelector('img').src ='/static/images/logo.png';
        });
    }
}

class EleMedia{
    constructor(media =[]){
        this.media = media;
        this.currentIndex = -1;
        this.createElement();
        this.img = this.element.querySelector('img');
        this.addEvents();
        if (this.media)
            this.cycleMedia(1);
        else
            this.currentIndex = 0;
    }

    createElement(){
        this.element = document.createElement('div')
        this.element.classList.add('img-container');
        this.element.innerHTML =   `<input type="text" name="media_link" class="d-none form-control" style="position: absolute;z-index: 100;">
                                    <img src="/static/images/logo.png" >
                                    <div class="nav-btn" style="left: 0px;">
                                        <i class="fas fa-caret-left icon " style="vertical-align: top;"></i>
                                    </div>
                                    <div class="nav-btn" style="right: 0px;">
                                        <i class="fas fa-caret-right icon" style="vertical-align: top;"></i>    
                                    </div>
                                    <div class="img-btns">
                                        <input type="file" name="img_upload" accept="image/*" class="d-none" id="img_upload">
                                        <i class="fas fa-upload" data-action="upload"></i>
                                        <i class="fas fa-link" data-action="link"></i>
                                        <i class="fas fa-external-link-alt" data-action="expand"></i>
                                    </div>`
    }
    
    addEvents(){
        // add nav btns events
        const navBtn = this.element.querySelectorAll('.nav-btn'); 
        navBtn[0].addEventListener('click',() => this.cycleMedia(-1));
        navBtn[1].addEventListener('click',() => this.cycleMedia(1));
        this.element.querySelector('input').addEventListener('paste',(e)=>{
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            e.target.value += pastedText;
            const currentScroll = window.scrollX;
            setTimeout(() => {
                window.scrollTo(currentScroll,0);
            }, 0);
        })
    }

    expandMediaViewer(viewer,element){
        if (this.media.length == 0)
            return;
        let elements = [];
        const media_viewer=document.querySelector(".media_viewer")
        elements.push(media_viewer);
        elements.push(document.querySelector("#details"));
        elements.push(document.querySelector("#info-page"));
        elements.push(document.querySelector("#anchor"));
        elements.push(document.querySelector('#closeMediaViewer'));
        if (viewer.element.planType == 'full'){
            elements.push(...document.querySelectorAll('#diet_plan,#diet_plan+.base-info'));
            elements.push(...document.querySelectorAll('#exercies_plan,#exercies_plan+.base-info'));
        }
        
        toggel_elements(elements);
        media_viewer.innerHTML ='';
        for (let img_src of this.media){
            img_src = (img_src.includes(`${viewer.element.eleType}_images`))?`/media/${img_src}`:img_src;
            let img = viewer.displayImg(img_src);
            media_viewer.append(img)
           
        }
        viewer.toggelNavBtn();
        viewer.mediaEle =element;
    
    } 
  
    updatMedia(img_link){
        if (!this.media.includes(img_link))
            this.media.push(img_link);
        if(img_link.includes(`plans_images`) || img_link.includes(`recipes_images`))
            img_link = MediaUrl + img_link;
        this.currentIndex = this.media.indexOf(img_link)
        this.img.src =  img_link;  
    }
    
    cycleMedia(direction){
        if(this.media.length < 1)
            return;

        //update index
        if(direction == 1)
            this.currentIndex = (this.currentIndex + 1) % this.media.length;
        else 
            this.currentIndex = (this.currentIndex === 0) ? this.media.length - 1 : (this.currentIndex - 1) % this.media.length;
        
        //set image src 
        let currentMedia = this.media[this.currentIndex]  
        if (currentMedia.includes(`plans_images`) || currentMedia.includes(`recipes_images`))
            this.img.src = MediaUrl + currentMedia;
        else
            this.img.src = currentMedia;
            
    }


}

class EleInfoPreview{
    constructor(data){
        this.data = data; 
        this.createElement();  
    }

    createElement(){
        this.element = document.createElement('div')
        this.element.classList.add('plan-info');
        this.element.innerHTML = this.data;
    }
}

class Recipe extends UserElement{
    constructor(data,type,details){
        super(type,data,details); 
        this.category = data.category;
        this.serv = data.serv;
        this.prepTime = data.prepTime;
        this.nurtients = data.total_nurtients;
        this.ingredients_nurtients = data.ingredients_nurtients;
        console.log(data);
        this.createElement(data.media);       
    }

    getInfoTemplate(){
        return`<ul style="margin: 0;padding: 0;">
                    <li><b>Creator:</b> ${this.user}</li>
                    <li><b>Type :</b>${this.category}</li>
                    <li style="position: relative;"><b>Serving:</b><input type="number" value="${this.serv}" class="display-input"></li>
                    <li style="position: relative;"><b>prep Time:</b>
                        <input type="number" name='hours' value="${this.prepTime.slice(0, 1)}" class="display-input" ><span style="right: 42px;">H:</span>
                        <input type="number" name='minutes' value="${this.prepTime.slice(2, 4)}" class="display-input" style="left: 123px;"><span style="right: 9px;">M</span>
                    </li>
                    <li><b>Created:</b>${this.created}</li>
                    <li><b>Edited:</b> ${this.modefied}</li>
                </ul>`
    }

    updateServing=(event)=>{
        const input = event.target
        console.log(input);
        patch_to_server(`/diet/edit_ele/recipes/${this.id}`,JSON.stringify({'serv':input.value}),() => {this.serv=input.value})
    }
    
    updatePrepTime=(event)=>{
        const input = event.target
        console.log(input);
        let value,prepTimeTxt;
        if (input.name === 'hours'){
            let min = input.nextElementSibling.nextElementSibling.value
            value = +input.value * 60 + +min;
            prepTimeTxt=`${input.value}:${min}:00`;
            console.log(min)
        }else{
            let hours = input.previousElementSibling.previousElementSibling.value
            value = +hours * 60 + +input.value;
            prepTimeTxt=`${hours}:${input.value}:00`;
            console.log(hours)
        }
        console.log(value);
        patch_to_server(`/diet/edit_ele/recipes/${this.id}`,JSON.stringify({'prep_time':value}),() => {this.prepTime=prepTimeTxt})
    }

    fillDetails(){
        const parent=document.querySelector('#details');
        //create ingredients section
        this.ingredients = document.createElement('div');
        this.ingredients.classList.add('section');
        this.ingredients.id = `ingredients`;
        this.ingredients.innerHTML = `<span style="position:relative">
                                         <i class="fas fa-plus add-btn" onclick="addIngredient()" ></i>
                                         <h3 class="header"> Ingredients:</h3>
                                    </span>`;
        //add the ingredient list
        const ingredientsList = document.createElement('ul');
        ingredientsList.className = 'detail pl-5 py-2';
        this.details[0].details.forEach(ele => {
                                ingredientsList.innerHTML += `<li>${ele}</li>`;    
                            })
        this.ingredients.append(ingredientsList);
        // create directions section
        this.directions = document.createElement('div');
        this.directions.classList.add('section');
        this.directions.id = `directions`;
        this.directions.innerHTML = `<span style="position:relative">
                                         <h3 class="header">Directions:</h3>
                                     </span>
                                     <span class='detail' ondblclick="editSection(this)">${this.details[1].details}</span>`;
        //add elements to the dom
        parent.append(this.ingredients,this.directions);
    }

    updateIndex(){
        let index=document.querySelector('#index ul');
        for(let n in this.nurtients){
            index.innerHTML+=`
            <li>
                <b>${n}: </b><span class="nurtient">${this.nurtients[n]}<span>
            </li>`
        }
    }
}
class Plan extends UserElement{
    constructor(data,type,details,viewer){
        super(type,data,details,viewer);
        this.planType= data.plan_type; 
        this.duration = data.duration;
        this.goal = data.goal; 
        this.createElement(data.media);      
    }


    getInfoTemplate(){
        return`<ul style="margin: 0;padding: 0;">
                    <li><b>Creator:</b> ${this.user}</li>
                    <li><b>Type :</b>${this.planType}</li>
                    <li><b>Goal:</b> <div contenteditable="true" name="ele-goal" class="editableDiv" >${this.goal}</div></li>
                    <li><b>duration:</b> ${this.duration}<input type="number" class="hiddenNum" value="${+this.duration.split(' ')[0]}" min="0"></li>
                    <li><b>Created:</b> ${this.created}</li>
                    <li><b>Edited:</b> ${this.modefied}</li>
                </ul>`
    }
    
    updateGoal=(event)=>{
        const input = event.target
        let org_text = input.textContent
        if(input.textContent =='')
            input.textContent = this.goal;
        console.log(input.textContent);
        patch_to_server(`/diet/edit_ele/plans/${this.id}`,JSON.stringify({'goal':input.textContent}),()=>{this.goal=input.textContent})
    }

    updateDuration=(event)=>{
        const input = event.target
        console.log(input);
        patch_to_server(`/diet/edit_ele/plans/${this.id}`,
                     JSON.stringify({'duration':input.value*24*60}),
                     () => {
                         let text = input.previousSibling;
                         console.log(`P${input.value}D00H:00M:00S`)
                         text.textContent=formatDuration(`P${input.value}D00H:00M:00S`)
                         this.duration=formatDuration(`P${input.value}D00H:00M:00S`);
                     }
                )
    }

    fillDetails(data=this.details,parent=document.querySelector('#details')){
        if(this.planType == "full"){
            this.displayLinkedPlans();
        }
        for (let detail of data){
            if (detail.section != 'diet_plan' && detail.section != 'exercies_plan'){
                let section = new DetailSection(detail,parent); 
                let sub_section = section.element.children[2];
                section.addEventsHandelers(this.viewer);
                if (detail.sub_sections.length > 0)
                    this.fillDetails(detail.sub_sections,sub_section);
                
            }           
        }
    }

    updateIndex(parent,data=this.details,suffix=''){
        const index=document.querySelector('#index ul');
        const navAnchor = document.querySelector('#anchor-select');
        if(!parent){
            index.innerHTML ='';
            navAnchor.innerHTML = '<option value="info-page" selected>Info Page</option>';
            if(this.planType == 'full')
                navAnchor.innerHTML +='<option value="diet_plan">Diet Info</option><option value="exercies_plan">Exercies Info</option>'    
        }
        for (let detail of data){
            if (!(this.planType == 'full' && (detail.section == 'diet_plan' || detail.section == 'exercies_plan'))){
                let option = document.createElement('option');
                option.value = `section${detail.id}`;
                option.textContent = `${suffix} ${detail.section}`;
                navAnchor.append(option)
            }
            let title = document.createElement('li');
            if(this.planType == 'full' &&(detail.section == 'diet_plan' || detail.section == 'exercies_plan'))
                title.innerHTML =`<a href="#">${detail.section}</a>` 
            else
                title.innerHTML =`<a href="#section${detail.id}">${detail.section}</a>` 
            if (detail.sub_sections.length>0){
                let nextSuffix = suffix + `${detail.section} >`
                let section = document.createElement('ul');
                section.classList.add('d-none');
                this.updateIndex(section,detail.sub_sections,nextSuffix);
                title.append(section);
            }
            if(!parent || parent == index)
                index.append(title);  
            else
                parent.append(title);       
        }
    }

    displayLinkedPlans(){
        this.dietPlan = new Plan(this.details[0].details,'plans',this.details[0].sub_sections,this.viewer);
        this.exerciesPlan = new Plan(this.details[1].details,'plans',this.details[1].sub_sections,this.viewer); 

        const dietCard = document.querySelector(`#diet_plan`); 
        const exerciesCard = document.querySelector(`#exercies_plan`); 

        dietCard.insertAdjacentElement('afterend',this.dietPlan.eleBrief);
        exerciesCard.insertAdjacentElement('afterend',this.exerciesPlan.eleBrief);

        this.dietPlan.eleBrief.style.height ='calc(50% - 70px)';
        this.exerciesPlan.eleBrief.style.height ='calc(50% - 70px)';

        dietCard.querySelector('input').value = this.dietPlan.title;
        exerciesCard.querySelector('input').value = this.exerciesPlan.title;

        dietCard.querySelector('input').addEventListener('blur',this.dietPlan.updateTitle);
        exerciesCard.querySelector('input').addEventListener('blur',this.exerciesPlan.updateTitle);

        
        //headear = DetailSection.createHeader('Diet Plan');
        //document.querySelector('#details').append(headear);
        //sub_section = headear.children[2];
        //this.dietPlan.fillDetails(undefined,sub_section);
        this.dietPlan.fillDetails();
        document.querySelector('#details').innerHTML+='<hr>'
        //let headear = DetailSection.createHeader('Exercies Plan');
        //document.querySelector('#details').append(headear);
        //let sub_section = headear.children[2];
        //this.exerciesPlan.fillDetails(undefined,sub_section);
        this.exerciesPlan.fillDetails();
        
    }

    
}

class DetailSection{
    constructor(data,parent){
        this.id = data.id;
        this.section = data.section;
        this.details = data.details;
        this.order = data.order;
        this.editing = false;
        this.createElement(parent)
    }
   
    static createHeader(headerTitle){
        let header = document.createElement('div');
        header.classList.add('section');
        header.innerHTML = `
        <span style="position:relative" ondragover="event.preventDefault()">
            <i class="fas fa-plus add-btn"></i>
            <h3>${headerTitle}:</h3>
        </span>
        <span class='detail'></span>
        <span></span>
        <div class="addBtn sec-btn">
            <i class="fas fa-plus"></i>
        </div>`;
        const addbtn = header.querySelector('.addBtn');

        addbtn.addEventListener('dragover',(event) => {
            event.preventDefault(); 
            addbtn.style.opacity = '0.8';
            addbtn.style.height = '25px'; 
        });

        addbtn.addEventListener('dragleave',() => {
                    addbtn.style.opacity = ''; 
                    addbtn.style.height = ''; 
                });
        addbtn.addEventListener('drop',() => this.reorderSections(addbtn,this.element,viewer))
        addbtn.addEventListener('click',() =>this.createNewSection(this.element,'sibling',viewer) )
        header.querySelector('span i').addEventListener('click',() =>this.createNewSection(this.element,'parent',viewer) )
        return header
    }

    fillTemplate(){
        return`
        <span style="position:relative" ondragover="event.preventDefault()">
            <i class="fas fa-plus add-btn"></i>
            <input class="header display-input" type="text" value="${this.section}:" onkeydown="this.style.border='none'">
        </span>
        <span class='detail'>${this.details}</span>
        <span></span>
        <div class="addBtn sec-btn">
            <i class="fas fa-plus"></i>
        </div>`
    }
       
    createElement(parent){
        this.element = document.createElement('div');
        this.element.classList.add('section');
        this.element.id = `section${this.id}`;
        this.element.draggable = true;
        this.element.setAttribute('data-order', this.order);
        this.element.innerHTML = this.fillTemplate();
        parent.append(this.element)

    }

    addEventsHandelers(viewer){
        this.viewer = viewer
        const detail = this.element.querySelector('.detail');
        const header = this.element.querySelector('span');
        const addbtn = this.element.querySelector('.addBtn');
        this.element.addEventListener('dragstart',(event) => {
            event.stopPropagation()
            viewer.openDragMode(event,undefined,this)
            this.enterDragMode();
        });
        this.element.addEventListener('dragend', (event) => {
            console.log(this,this.element)
            viewer.endDragMode()
            this.existDragMode(viewer);
        });
        header.addEventListener('drop',() => this.reorderSections(this.element.children[2],this.element,viewer));
        addbtn.addEventListener('dragover',(event) => {
                                    event.preventDefault(); 
                                    addbtn.style.opacity = '0.8';
                                    addbtn.style.height = '25px'; 
                                });
        
        addbtn.addEventListener('dragleave',() => {
                                    addbtn.style.opacity = ''; 
                                    addbtn.style.height = ''; 
                                });
        addbtn.addEventListener('drop',() => this.reorderSections(addbtn,this.element,viewer))
        addbtn.addEventListener('click',() =>this.createNewSection(this.element,'sibling',viewer) )
        header.querySelector('i').addEventListener('click',() =>this.createNewSection(this.element,'parent',viewer) )
        header.querySelector('input').addEventListener('blur',(event) => this.renameSection(event,viewer));
        detail.addEventListener('dblclick',this.editDetails)                        
    }

    reorderSections(anchor,section,viewer){
        console.log(anchor,section);
        let ref_ele = (anchor.tagName =='DIV')?this.element:anchor;
        anchor.style.opacity = ''; 
        anchor.style.height = '';
        let position = (anchor.tagName =='DIV')?'afterend':'afterbegin';
        ref_ele.insertAdjacentElement(position, viewer.dragEle.element);
        let new_parent = ref_ele.parentElement.closest('.section');
        let orders = DetailSection.setAndUpdateOrder(new_parent,section,viewer.dragEle.element,true);
        console.log(orders);
        patch_to_server(`/diet/edit_sec/${viewer.dragEle.id}`,
                    JSON.stringify({'parent_section':new_parent.id.replace('section',''),'orders':orders}),
                    () => {});
    }

    createNewSection(anchor,relation,viewer){
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
        let order = DetailSection.setAndUpdateOrder(parent_ele,sibling_ele);
        post_to_server(`/diet/edit_sec/${viewer.element.id}`,
                        JSON.stringify({'parent_id':parent_id,'order':order}),
                        (data) =>{
                            post_to_server(window.location.pathname,{},(fulldata) =>{viewer.element.updateIndex(undefined,fulldata.details)})
                            let section = new DetailSection(data.data,parent_ele);
                            section.addEventsHandelers(viewer);

                            if (relation === 'parent')
                                anchor.children[2].insertBefore(section.element, anchor.querySelector('.section'));
                            else
                                anchor.parentElement.insertBefore(section.element,anchor.nextElementSibling); 
                            section.element.querySelector('.header').focus();
                            
                        });
    }

    renameSection(event,viewer){
        if (viewer.dragEle)
            return;
        console.log('touched');
        let header = event.target;
        let section = header.value.replace(':','').trim() 
        //validate the value
        if (section == ''){
            header.style.border='1px solid #f00';
            header.focus();
            return;
        }
        // avoid having dublicate sections names in the same level
        let otherSubSections = this.element.parentElement.querySelectorAll(':scope>div.section > span > .header');
        console.log(otherSubSections); 
        otherSubSections.forEach(sec =>{
            if(sec !== header && sec.value.replace(':','').trim() === section){
                header.style.border='1px solid #f00';
                header.focus();
                return;
            }
        });
        
        // send to server
        patch_to_server(`/diet/edit_sec/${this.id}`,
            JSON.stringify({'section':`${section}`}),
            () => {
                    //update related elements
                    document.querySelector(`a[href="#section${this.id}"]`).textContent = section;
                    document.querySelector(`option[value="section${this.id}"]`).textContent = document.querySelector(`option[value="section${this.id}"]`).textContent.trim().replace(/>([^>]+)$/, `> ${section}`);
            }
        )
    }

    deleteSection(){
        console.log(this.id);
        delete_from_server(`/diet/edit_sec/${this.id}`,() => {
            this.element.remove();
            let regex = document.querySelector(`option[value="section${this.id}"]`).textContent.replace(/ /g,'');
            console.log(regex,new RegExp(`^${regex}(>.*)?`));
            let selectElement =document.querySelector('#anchor-select');
            Array.from(selectElement.options).forEach(opt => {
                console.log(opt.textContent.replace(/ /g,''),opt.textContent.replace(/ /g,'').match(new RegExp(`^${regex}(>.*)?`)));
                if (opt.textContent.replace(/ /g,'').match(new RegExp(`^${regex}(>.*)?`)))
                    opt.remove();
            });
            document.querySelector(`a[href="#section${this.id}"]`).parentElement.remove();
        });
    }        

    enterDragMode(){
        console.log(this);
        this.element.querySelector('i').style.display='none';
        let eles  = this.element.children;
        this.element.querySelector('input').blur();
        console.log(eles);
        for (let ele of eles){
            if (ele !== eles[0])
            ele.style.display = 'none';
        }
    }
    
    existDragMode(viewer){
        viewer.dragEle =null;
        let eles  = this.element.children;
        this.element.querySelector('i').style.display='';
        for (let ele of eles){
            ele.style.display = '';
        }
    }

    static setAndUpdateOrder(parent_ele,ref_ele,ele,all=false){
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

    editDetails = (event)=>{
        if (this.viewer.editing){
            return
        }
        const detailArea = event.target.closest('.detail'); 
        const details = detailArea.innerHTML;
        let clickedElement = null;
      
        detailArea.innerHTML = '<div id="editor" style="height: 200px;"></div>';
        
        var SizeStyle = Quill.import('attributors/class/size');
        SizeStyle.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px'];
        Quill.register(SizeStyle, true);

        const quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'font': [] }],  
                    [{ 'size': ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px'] }], 
                    ['bold', 'italic', 'underline'],
                    [{ 'script': 'sub' }, { 'script': 'super' }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    ['link', 'image', 'video']
                ]
            }
        });
        const editor = document.querySelector('.ql-editor')

        const detectClickedEle = event => {
            clickedElement = event.target;
            console.log(clickedElement.closest('.detail') !==  detailArea);
        };
        document.addEventListener('click' ,detectClickedEle)

        editor.addEventListener('blur', () => {
            console.log('blured');
            if (clickedElement && clickedElement.closest('.detail') === detailArea) {
                quill.focus();
                return;
            }
            if (clickedElement && clickedElement.className.includes('ql-')) {
                return;
            }
            this.viewer.editing = false;
            const editedDetails = quill.root.innerHTML.trim();
            detailArea.innerHTML = editedDetails === '<p><br></p>' ? '' : editedDetails;
            document.removeEventListener('click', detectClickedEle);
        });

       
            // document.querySelectorAll('.ql-size .ql-picker-item').forEach(item => {
            //     item.innerText =' '+ item.getAttribute('data-value');
            // });
            quill.root.innerHTML = details;
            editor.focus();
        
    
        this.viewer.editing = true;
    }

    saveEditedDetails(){

    }
}


