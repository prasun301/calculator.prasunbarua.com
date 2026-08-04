const input = document.getElementById("search-box");
const dropdown = document.getElementById("search-results");
const cards = [...document.querySelectorAll(".calc-card")];

const calculators = cards.map(card => ({
    title: card.querySelector("h3").textContent,
    desc: card.querySelector("p").textContent,
    url: card.href
}));

let selected = -1;
let matches = [];

function renderDropdown(list){

    dropdown.innerHTML="";

    if(!list.length){

        dropdown.innerHTML='<div class="no-results">No calculators found</div>';

        dropdown.style.display="block";

        return;

    }

    list.forEach((item,index)=>{

        const div=document.createElement("div");

        div.className="search-item";

        if(index===0) div.classList.add("active");

        div.innerHTML=`
            <strong>${item.title}</strong>
            <span>${item.desc}</span>
        `;

        div.onclick=()=>location.href=item.url;

        dropdown.appendChild(div);

    });

    dropdown.style.display="block";

    selected=0;

}

input.addEventListener("input",()=>{

    const q=input.value.trim().toLowerCase();

    cards.forEach(card=>{

        card.style.display=card.innerText.toLowerCase().includes(q)
            ?"flex":"none";

    });

    if(q===""){

        dropdown.style.display="none";

        return;

    }

    matches=calculators.filter(c=>

        c.title.toLowerCase().includes(q) ||

        c.desc.toLowerCase().includes(q)

    );

    renderDropdown(matches);

});

input.addEventListener("keydown",e=>{

    if(dropdown.style.display==="none") return;

    const items=[...dropdown.querySelectorAll(".search-item")];

    if(e.key==="ArrowDown"){

        e.preventDefault();

        selected=Math.min(selected+1,items.length-1);

    }

    if(e.key==="ArrowUp"){

        e.preventDefault();

        selected=Math.max(selected-1,0);

    }

    items.forEach(i=>i.classList.remove("active"));

    if(items[selected]) items[selected].classList.add("active");

    if(e.key==="Enter"){

        e.preventDefault();

        if(matches[selected])

            location.href=matches[selected].url;

    }

});

document.addEventListener("click",e=>{

    if(!e.target.closest(".search-container"))

        dropdown.style.display="none";

});

input.addEventListener("focus",()=>{

    if(matches.length)

        dropdown.style.display="block";

});
