const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// const fullMonthNames = ["January", "Febuary", "March", "April", "May", "June", "July", "August", "Septemper", "Octoper", "November", "December"];

let month = new Date().getMonth() + 1;
let year = new Date().getFullYear();
    
function set_page(){
    post_to_server(`/diet/logs`,JSON.stringify({
        'month':month,
        'year':year,
    }),createCalendar)
    getSummery();

    const cal = document.querySelector('tbody');
cal.addEventListener('mouseenter',() => {
    console.log('enetr')
    window.addEventListener('mousemove',test);
})

cal.addEventListener('mouseleave',() => {
    console.log('leve')
    window.removeEventListener('mousemove',test);
})
document.querySelector('#prev_month').addEventListener('click', () => {
    month = (month == 1)?12:--month;
    year = (month == 1)?--year:year;
    post_to_server(`/diet/logs`,JSON.stringify({
        'month':month,
        'year':year,
    }),createCalendar)
})
document.querySelector('#next_month').addEventListener('click', () => {
    month = (month == 12)?1:++month;
    year = (month == 12)?++year:year;
    post_to_server(`/diet/logs`,JSON.stringify({
        'month':month,
        'year':year,
    }),createCalendar)
})
}

function resize_page(){
    return;
}

function set_header(){
    let header = document.querySelector('#current_month');
    header.innerHTML = `${monthNames[month-1]}, ${year}`
}

function createCalendar(data) {
    console.log(data) 
    set_header();
    const cal = document.querySelector('tbody');
    cal.innerHTML ='';
    let counter = 0;
    let row;
    for (let i=0;i<data.days;i++){
        if (i % 7 == 0){
            row = document.createElement('tr');
        }
        
        let cell = document.createElement('td')        
        if( i < data.empty){
            cell.innerHTML='<span></span>'    
        }else{
            let day = i-data.empty+1
            let date =`${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`
            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            let weekDay =  daysOfWeek[new Date(date.split('-').reverse()).getDay()];
            const logEntry = data.logs[date]          
            if (logEntry && logEntry.type == 'full'){
                cell.innerHTML=
                `<span>${weekDay}-${day}</span>
                    <div class='full_plan'>
                        <p>FUll</p>
                        ${generate_log(logEntry)}
                    </div>
                `;    
            }else{
                let diet_log = logEntry?logEntry[0]:'';
                let exercies_log = logEntry?logEntry[1]:'';

                cell.innerHTML=
                `
                    <span>${weekDay}-${day}</span>
                    <div>
                        <p>Diet</p>
                        ${generate_log(diet_log)}
                    </div>
                    <div>
                        <p>Exercies</p>
                        ${generate_log(exercies_log)}
                    </div>
                `;
            }
            
        }
        cell.setAttribute('data-info', i);

            // let hoverTimeout;
            // let hovered;
            // cell.addEventListener('mouseover', (event) => {
            //     if (hoverTimeout){
            //         console.log('cleared ',i)
            //         clearTimeout(hoverTimeout);
            //     }
                    
            //     hovered = event.target.closest('td');
            //     console.log(i,' current ',hovered);

            //     hoverTimeout = setTimeout(() => {
            //         // Check if the mouse is still over the cell
                    
            //         if (event.target.closest('td') === hovered) {
            //             console.log('apply ',i);
            //             const rect = event.target.getBoundingClientRect();  // Get the cell's position
            //             const tableRect = cal.parentElement.getBoundingClientRect();    // Get the table's position
    
            //             const offsetX = ((rect.left - tableRect.left) / tableRect.width) * 100;
            //             const offsetY = ((rect.top - tableRect.top) / tableRect.height) * 100;
    
            //             if (i % 7 === 0) {
            //                 cal.parentElement.style.transformOrigin = `0% ${offsetY}%`;
            //             } else if (i % 7 === 1) {
            //                 cal.parentElement.style.transformOrigin = `100% ${offsetY}%`;
            //             } else {
            //                 cal.parentElement.style.transformOrigin = `${offsetX}% ${offsetY}%`;
            //             }
    
            //             cal.parentElement.classList.add('hovered');
            //     }else{
            //         console.log('disapled ',i);
            //     }
            //     hovered = null;
            //     hoverTimeout = null;
            // }, 2000);
            // });
            // cal.parentElement.addEventListener('mouseout', () => {
            
            // }); 
        row.append(cell);
        if (i == data.days-1 && data.days%7 != 0){
            row.innerHTML+='<td><span></spnn></td>'.repeat(7-(data.days%7));
            cal.append(row);
        }
        
        if (i % 7 == 6){
            cal.append(row);
        }
    }      
} 

function generate_log(logEntry){
    let full = (logEntry && logEntry.type == 'full')?`
    <h6>
        ${logEntry.diet}
    </h6>
    <h6>
        ${logEntry.exercies}
    </h6>
    ` :'';
    if (logEntry){
        return `
        <div class='plan_log'>
            <h5>
                ${logEntry.title}
                <span>${logEntry.score}</span>
            </h5>
            ${full}
            <p>${logEntry.feedback}</p>
        </div>`
    }else{
        return`
        <div class='plan_log'>
            <h5>
                None
            </h5>
            <span>0</span>
            ${full}
            <p></p>
        </div>`
    }

}

function getSummery(period='month',value=month){
    post_to_server(`/diet/summery`,JSON.stringify({
        'period':period,
        'value':value,
    }),printSummery)
    
}

function printSummery(data){
    let header = (data.period=='year')?`${year}  Summery`:
                 (data.period=='month')?`${monthNames[month-1]}, ${year}  Summery`:
                 (data.period=='week')?`${monthNames[month-1]}, week 1  Summery`:
                 (data.period=='plan')?`current plan  Summery`:
                 `that day Summery`;
    console.log( header);
    document.querySelector('#summery_header').innerHTML = header;
    document.querySelector('#score').innerHTML = data.score.toPrecision(3);
    console.log(data.values);
    drawProgress(data.values);

}

function drawProgress(data){
    
    // Extracting dates, scores, and goals
    const labels = data.map(item => {
        let date = new Date(item[0]);
        console.log(date);
        return date.getDay();
    }); // Dates for x-axis
    const scores = data.map(item => item[1]); // Scores for y-axis
    const goals = data.map(item => item[2]);
    const ctx = document.getElementById('progress').getContext('2d');
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels, 
            datasets: [
                {
                    label: 'Score',
                    data: scores,
                    borderColor: 'rgba(75, 192, 192, 1)', 
                    backgroundColor: 'rgba(75, 192, 192, 0.2)', // Fill color
                    borderWidth: 2,
                    fill: true // Fill the area under the line
                },
                {
                    label: 'Goal',
                    data: goals,
                    borderColor: 'rgba(255, 99, 132, 1)', // Line color for goals
                    backgroundColor: 'rgba(255, 99, 132, 0.2)', // Fill color for goals
                    borderWidth: 2,
                    fill: true // Fill the area under the line
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '%'
                    },
                    beginAtZero: true
                }
            }
        }
    });

}

let hoverTimeout;
let hovered;
let lastEventTime = 0;
let test = (event) =>{
    const currentTime = Date.now();
    if (currentTime - lastEventTime >= 500) {
        lastEventTime = currentTime;
        const cell = event.target.closest('td');
        const cal = document.querySelector('table')
        
        if (!cell){
            cal.style.transform = '';
            cal.style.fontSize ='1em'
            cal.classList.remove('hovered');
            if (hoverTimeout){
                clearTimeout(hoverTimeout);
            }
        }else if(cell !== hovered ) {
            if(cal.classList.contains('hovered') && cell){
                zoom_in_cell(cell,cal);
                cal.style.transform += 'scale(3)';
                cal.style.fontSize ='0.7em';
                hovered = cell;
            }else{
                hovered = cell;
                if (hoverTimeout){
                    clearTimeout(hoverTimeout);
                }
                console.log('disapled')
                hoverTimeout = setTimeout(() => {
                    zoom_in_cell(cell,cal);
                    cal.classList.add('hovered');
                    cal.style.transform += 'scale(3)';
                    cal.style.fontSize ='0.7em';

                },2000);
            }       
        }
        console.log(cell);
    }
}
function zoom_in_cell(cell,cal){
    const rect = cell.getBoundingClientRect();  
    const tableRect = cal.getBoundingClientRect();
    console.log(rect,tableRect);
    const offsetX = ((rect.left + (rect.width/2) - tableRect.left) / tableRect.width) * 100;
    const offsetY = ((rect.top + (rect.height/2) - tableRect.top) / tableRect.height) * 100;
    i = cell.dataset.info;
    console.log(i);
    if (i % 7 === 0) {
        cal.style.transformOrigin = `0% ${offsetY}%`;
        cal.style.transform = `translate(0%,${50-offsetY}%)`;

    } else if (i % 7 === 6) {
        cal.style.transformOrigin = `100% ${offsetY}%`;
        cal.style.transform = `translate(0%,${50-offsetY}%)`;
    } else {
        cal.style.transformOrigin = `${offsetX}% ${offsetY}%`;
        cal.style.transform = `translate(${50-offsetX}%,${50-offsetY}%)`;
    }

    window.removeEventListener('mousemove',test);
    setTimeout(() => {
        window.addEventListener('mousemove',test)
    },1000) ;   
}

/* make the current mouse position the origin for zoom ,
 change the orgin smothely to mouse position rounded to nearst 10px in 0.1s ,
 set max and min value to keppp the table fill the space ,
 */ 
    