let viewer;

function set_page(){
   

    //add header group events
    const select = document.querySelector('#groupEditor');
    const addBtn = select.previousElementSibling;
    select.addEventListener('blur' ,() =>{toggel_elements([select,addBtn])});
    addBtn.addEventListener('click', () =>{toggel_elements([select,addBtn])});
    const groupList = document.querySelectorAll('.groups > span[class*=danger] i');
    // get elemet data
    //const url = window.location.pathname;
    let url = 'plans/2/test%20-%20full'
    //let url = 'recipes/1/test'
    const type = (url.includes('plan'))?'plans':'recpies';
    
    post_to_server(url,{},(data) =>{
        viewer = new Viewer(data.data,type,data.details)
        select.addEventListener('change',()=>{
            updateElementsGroups(data.data.user_id,select.value,`${type}`,0);
            select.blur();
        });
        groupList.forEach(btn =>{
            btn.addEventListener('click',() => updateElementsGroups(data.data.user_id,0,`${type}`,btn.dataset.id,btn.parentElement));
        });
        if (viewer.type =='plans'){
            let goal = viewer.element.info.element.querySelector('li div');
            if (goal.textContent.trim() == '' && this.viewer.element.created == 'Just now')
                goal.focus();
        }        
    })
}
function submitByEnter(){
    let divs = document.querySelectorAll('div[contenteditable],input[type=text]');
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

function resize_page(){
    if (viewer && viewer.anchor && viewer.viewer){
        let anchor = document.querySelector(`#${viewer.anchor.id}`)
        if (viewer.imageViewerMode){
            anchor = document.querySelector(`[src="${viewer.mediaEle.img.media[viewer.currentMedia]}"]`).closest('.viewer-img');
        }
        let newLeft = ((window.innerWidth > 680)?0:300)+(anchor.getBoundingClientRect().left + viewer.viewer.scrollLeft) 
           
        viewer.viewer.scrollTo({
            left: newLeft, 
            behavior: 'auto'
          })
        console.log('scroll:',viewer.viewer.scrollLeft,'left',viewer.anchorLeft,'\n anchor',viewer.anchor.getBoundingClientRect().left,'\nviewer',viewer.viewer.getBoundingClientRect().left);

        viewer.toggelNavBtn();    
    }
}

function scrollToSetion(id){
    viewer.viewer.style.overflowX ='scroll';
    viewer.anchor = document.querySelector(`#${id}`);
    console.log(viewer.anchor);
    if (viewer.anchor == document.querySelector('#info-page'))
        viewer.viewer.scrollLeft = 0
    else
        viewer.anchor.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
        setTimeout(
            () => {
                viewer.viewer.style.overflowX ='hidden';
            },500
        )
    viewer.toggelNavBtn();
    
}








        




        



