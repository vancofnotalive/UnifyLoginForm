/* 
<documentation>
// show specifc error and hide 
showError("Invalid email" ,  "password")
hideError("password")

// hide all errors
hideError("" , true)


// --login states
// default
loginUniversal(loginStates.normal)
// processing data
loginUniversal(loginStates.processing)




</documentation>
*/


function getCurrentDeviceType() {
  const width = window.innerWidth;
  if (width <= 480) return "phone";
  if (width <= 768) return "tab";
  if (width <= 1024) return "lap";
  if (width <= 1440) return "pc";
  return "tv";
}
function bindMirroredInputs() {
  const map = {};

  // Collect all hosts and connected inputs
  document.querySelectorAll("input[host], textarea[host]").forEach(host => {
    const key = host.getAttribute("host");
    if (!map[key]) map[key] = { host: null, connects: [] };
    map[key].host = host;
  });

  document.querySelectorAll("input[connect], textarea[connect]").forEach(conn => {
    const key = conn.getAttribute("connect");
    if (!map[key]) map[key] = { host: null, connects: [] };
    map[key].connects.push(conn);
  });

  // Attach listeners
  for (const key in map) {
    const { host, connects } = map[key];
    if (!host) continue;

    const updateAll = (val, skipEl) => {
      if (host !== skipEl) host.value = val;
      connects.forEach(el => {
        if (el !== skipEl) el.value = val;
      });
    };

    host.addEventListener("input", () => updateAll(host.value, host));
    connects.forEach(conn => {
      conn.addEventListener("input", () => updateAll(conn.value, conn));
    });
  }
}

function handleMoveTags() {
  document.querySelectorAll("move[ele]").forEach(moveTag => {
    const selector = moveTag.getAttribute("ele");
    if (!selector) return;

    let original;
    if (selector.includes("@")) {
      const parts = selector.split("@");
      let base = document.querySelector(parts[0]);
      for (let i = 1; i < parts.length && base; i++) {
        base = base.querySelector(parts[i]);
      }
      original = base;
    } else {
      original = document.querySelector(selector);
    }

    if (!original) return;

    const moveAttributes = [...moveTag.attributes].filter(attr => attr.name !== "ele");

    let existing = moveTag.querySelector(original.tagName);

    const isInput = original.tagName === "INPUT" || original.tagName === "TEXTAREA";

    const shouldReplace =
      !existing ||
      moveAttributes.some(attr => existing.getAttribute(attr.name) !== attr.value) ||
      (isInput && existing.value !== original.value);

    if (!shouldReplace) return;

    if (existing) existing.remove();

    const clone = original.cloneNode(true);

    moveAttributes.forEach(attr => {
      clone.setAttribute(attr.name, attr.value);
    });

    if (isInput) {
      clone.value = original.value;
    }

    moveTag.appendChild(clone);
  });
}


  function moveElementsIntoActiveIf() {
    const currentDevice = getCurrentDeviceType();
    const matchingIfBlocks = [...document.querySelectorAll("if-block")].filter(el => {
      const devices = el.getAttribute("device")?.split("||").map(d => d.trim());
      return devices?.includes(currentDevice);
    });

    for (const activeIf of matchingIfBlocks) {
      const selector = activeIf.getAttribute("move");
      if (!selector) continue;

      let elementToMove = document.querySelector(selector);
      if (!elementToMove) {
        document.querySelectorAll("if-block").forEach(ifEl => {
          const maybe = ifEl.querySelector(selector);
          if (maybe) elementToMove = maybe;
        });
      }

      if (!elementToMove) continue;

      document.querySelectorAll("if-block").forEach(ifEl => {
        const existing = ifEl.querySelector(selector);
        if (existing) existing.remove();
      });

      if (elementToMove.parentElement) elementToMove.remove();
      activeIf.appendChild(elementToMove);
    }
  }

function applyDynamicStylesToHTML(htmlString) {
  const doc = new DOMParser().parseFromString(htmlString, "text/html");

  const propertyMap = {
    marginT: "margin-top",
    marginR: "margin-right",
    marginB: "margin-bottom",
    marginL: "margin-left",
    paddingT: "padding-top",
    paddingR: "padding-right",
    paddingB: "padding-bottom",
    paddingL: "padding-left",
    fs: "font-size",
  };

  const currentDevice = getCurrentDeviceType();

  const allTargets = [...doc.querySelectorAll("[ds]")].filter(el => {
    const insideIf = el.closest("if-block");
    if (!insideIf) return true;
    const devices = insideIf.getAttribute("device")?.split("||").map(d => d.trim());
    return devices?.includes(currentDevice);
  });

  allTargets.forEach(el => {
    const rules = el.getAttribute("ds").split(";").map(r => r.trim()).filter(Boolean);

    rules.forEach(rule => {
      let [rawProp, expression] = rule.split(":").map(s => s.trim());
      if (!rawProp || !expression) return;

      const prop = propertyMap[rawProp] || rawProp;

      let isImportant = false;
      if (expression.endsWith("!i")) {
        isImportant = true;
        expression = expression.slice(0, -3).trim();
      }

      // $t$.class@a@b_H or _W (nested walk from closest ancestor)
      expression = expression.replace(/\$t\$\.(.+?)_(H|W)/g, (_, chain, dim) => {
        const parts = chain.split("@");
        let base = el.closest(`.${parts[0]}`);
        if (!base) return "0";
        for (let i = 1; i < parts.length; i++) {
          base = base.querySelector(parts[i]);
          if (!base) return "0";
        }
        return dim === "H" ? base.offsetHeight : base.offsetWidth;
      });

      // Global .class_H or #id_W handler
      expression = expression.replace(/([.#][\w-]+)_(H|W)/g, (_, selector, dim) => {
        const nodes = doc.querySelectorAll(selector);
        for (const node of nodes) {
          const ifb = node.closest("if-block");
          if (!ifb || (ifb.getAttribute("device") || "").split("||").map(d => d.trim()).includes(currentDevice)) {
            return dim === "H" ? node.offsetHeight : node.offsetWidth;
          }
        }
        return "0";
      });

      try {
        const value = Function(`return ${expression}`)();
        if (!isNaN(value)) {
          el.style.setProperty(prop, value + "px", isImportant ? "important" : "");
        }
      } catch (err) {
        console.warn(`Failed to evaluate ds expression: "${expression}"`, err);
      }
    });
  });

  return doc.body.innerHTML;
}



function applyDynamicStyles() {
  const propertyMap = {
    marginT: "margin-top",
    marginR: "margin-right",
    marginB: "margin-bottom",
    marginL: "margin-left",
    paddingT: "padding-top",
    paddingR: "padding-right",
    paddingB: "padding-bottom",
    paddingL: "padding-left",
    fs: "font-size",
  };
  const currentDevice = getCurrentDeviceType();
  const all = [...document.querySelectorAll("[ds]")].filter(el => {
    const ifb = el.closest("if-block");
    if (!ifb) return true;
    const devs = (ifb.getAttribute("device")||"").split("||").map(d=>d.trim());
    return devs.includes(currentDevice);
  });

  all.forEach(el => {
    el.getAttribute("ds")
      .split(";")
      .map(r=>r.trim())
      .filter(Boolean)
      .forEach(rule => {
        let [rawProp, expr] = rule.split(":").map(s=>s.trim());
        if (!rawProp || !expr) return;
        const prop = propertyMap[rawProp]||rawProp;
        let important = false;
        if (expr.endsWith("!i")) {
          important = true;
          expr = expr.slice(0, -3).trim();
        }

        // 1) Replace $t$.class@sub@sub_H or _W
        expr = expr.replace(/\$t\$\.(.+?)_(H|W)/g, (_, chain, dim) => {
          const parts = chain.split("@");
          let node = el.closest(`.${parts[0]}`);
          if (!node) return "0";
          for (let i=1; i<parts.length; i++) {
            node = node.querySelector(parts[i]);
            if (!node) return "0";
          }
          return dim === "H" ? node.offsetHeight : node.offsetWidth;
        });

        // 2) Replace .class_H or #id_W
        expr = expr.replace(/([.#][\w-]+)_(H|W)/g, (_, sel, dim) => {
          const nodes = document.querySelectorAll(sel);
          for (const n of nodes) {
            const ifb = n.closest("if-block");
            if (!ifb || (ifb.getAttribute("device")||"").split("||").map(d=>d.trim()).includes(currentDevice)) {
              return dim === "H" ? n.offsetHeight : n.offsetWidth;
            }
          }
          return "0";
        });

        // Evaluate
        try {
          const val = Function(`return ${expr}`)();
          if (!isNaN(val)) {
            el.style.setProperty(prop, val + "px", important ? "important" : "");
          }
        } catch (err) {
          console.warn(`Failed to evaluate ds expression: "${expr}"`, err);
        }
      });
  });
}

// Same logic but on an HTML string




  function setBodyHeight() {
    document.querySelector("body").style.height = window.innerHeight + "px";
  }

function init() {
  setBodyHeight();
  moveElementsIntoActiveIf();
  handleMoveTags();
  bindMirroredInputs();

  // First pass immediately
  applyDynamicStyles();

  // Second pass after images are loaded (layout stable)
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      applyDynamicStyles();
    });
  });

  // Optional fallback in case layout shifts again
  setTimeout(() => applyDynamicStyles(), 200);
}

  window.addEventListener("DOMContentLoaded", init);
  window.addEventListener("resize", init);

function checkLayoutLoop() {
  setTimeout(() => {

    const current = cleanString(document.body.innerHTML);
    const simulated = applyDynamicStylesToClone();
    if (normalizeHTML(current) !== normalizeHTML(simulated)) {
    applyDynamicStyles();
  }
  requestAnimationFrame(checkLayoutLoop);
}, 100)
}

function checkLayout() {
  const current = cleanString(document.body.innerHTML);
  const simulated = applyDynamicStylesToClone();
  if (normalizeHTML(current) !== normalizeHTML(simulated)) {
    applyDynamicStyles();
  }
  
}

checkLayout();
setTimeout(() => {
checkLayoutLoop();
}, 600)

function cleanString(str) {
  return str.replace(/[\n\r\t\f\v]+/g, ' ') // Replace escape sequences with space
            .replace(/ {2,}/g, ' ')         // Replace 2+ spaces with one
            .trim();                        // Remove leading/trailing spaces
}

function normalizeHTML(str) {
  return str
    .replace(/\s+/g, ' ')              // collapse whitespace
    .replace(/style="[^"]*"/g, '')     // remove all style attrs (optional)
    .trim();
}
function applyDynamicStylesToClone() {
  const clone = document.body.cloneNode(true);
  applyDynamicStylesToElement(clone); // reuse your existing logic but scoped to a passed element
  return cleanString(clone.innerHTML);
}

function applyDynamicStylesToElement(root) {
  const propertyMap = {
    marginT: "margin-top",
    marginR: "margin-right",
    marginB: "margin-bottom",
    marginL: "margin-left",
    paddingT: "padding-top",
    paddingR: "padding-right",
    paddingB: "padding-bottom",
    paddingL: "padding-left",
    fs: "font-size",
  };

  const currentDevice = getCurrentDeviceType();
  const all = [...root.querySelectorAll("[ds]")].filter(el => {
    const ifb = el.closest("if-block");
    if (!ifb) return true;
    const devs = (ifb.getAttribute("device") || "").split("||").map(d => d.trim());
    return devs.includes(currentDevice);
  });

  all.forEach(el => {
    el.getAttribute("ds")
      .split(";")
      .map(r => r.trim())
      .filter(Boolean)
      .forEach(rule => {
        let [rawProp, expr] = rule.split(":").map(s => s.trim());
        if (!rawProp || !expr) return;

        const prop = propertyMap[rawProp] || rawProp;
        let important = false;
        if (expr.endsWith("!i")) {
          important = true;
          expr = expr.slice(0, -3).trim();
        }

        expr = expr.replace(/\$t\$\.(.+?)_(H|W)/g, (_, chain, dim) => {
          const parts = chain.split("@");
          let node = el.closest(`.${parts[0]}`);
          if (!node) return "0";
          for (let i = 1; i < parts.length; i++) {
            node = node.querySelector(parts[i]);
            if (!node) return "0";
          }
          return dim === "H" ? node.offsetHeight : node.offsetWidth;
        });

        expr = expr.replace(/([.#][\w-]+)_(H|W)/g, (_, sel, dim) => {
          const nodes = root.querySelectorAll(sel);
          for (const n of nodes) {
            const ifb = n.closest("if-block");
            if (!ifb || (ifb.getAttribute("device") || "").split("||").map(d => d.trim()).includes(currentDevice)) {
              return dim === "H" ? n.offsetHeight : n.offsetWidth;
            }
          }
          return "0";
        });

        try {
          const val = Function(`return ${expr}`)();
          if (!isNaN(val)) {
            el.style.setProperty(prop, val + "px", important ? "important" : "");
          }
        } catch (err) {
          console.warn(`Failed to evaluate ds expression: "${expr}"`, err);
        }
      });
  });
}


  function changeInput(inp) {
      let currentType = inp.getAttribute("inputType")
      document.querySelectorAll(`*[inputtype=${currentType}]`).forEach(input => {
        let main =  input.closest("main");

      
    if (currentType == 'email') {
        input.querySelector("i").className = "fa-solid fa-signature";
        input.setAttribute("inputType" , "username")
          main.querySelector("input").setAttribute("placeholder" , "Username")
    }
    else if (currentType == 'username') {
  input.querySelector("i").className = "fa-solid fa-user";
        input.setAttribute("inputType" , "both")
        main.querySelector("input").setAttribute("placeholder" , "Email address or username")
    }
    else if (currentType == 'both') {
        input.querySelector("i").className = "fa-solid fa-envelope";
        input.setAttribute("inputType" , "email")
        main.querySelector("input").setAttribute("placeholder" , "Email address")
    }
    })
  }

  function showError(text , inputName) {
  //  document.querySelectorAll("#" + inputName).forEach(inp => {

  //    let parent = inp.closest(".form-content-input");
  //    let h2 = parent.querySelector("h2");
  //    h2.querySelector("strong").innerText = text;
  //    h2.style.scale = "1";
  //    h2.style.animation = "horizontal-shaking 200ms linear 3";
  //   })
  document.querySelectorAll("#" + inputName).forEach(element => {
   let errorMessage = element.querySelector("#errorMessage");
  let textContainer = errorMessage.querySelector("strong");
  textContainer.innerText = text;
   errorMessage.style.scale = "1";
  errorMessage.style.animation = "horizontal-shaking 200ms linear 3";
  })
   
  }
  

function hideError(inputName , hideAll = false) {
    if (!hideAll){

         document.querySelectorAll("#" + inputName).forEach(ele => {

          
        ele.querySelector("#errorMessage").style.scale = "0";
        })
        return "Removed"
    }
    document.querySelectorAll("#email").forEach(ele => {
     ele.querySelector("#errorMessage").style.scale = "0";
    })
    document.querySelectorAll("#password").forEach(ele => {
     ele.querySelector("#errorMessage").style.scale = "0";
    })
    return "Removed"

   
   

}
  
var loginStates = {
    "normal": "normal",
    "processing": "processing",
    "error": "error"
}
function login(state) {
   document.querySelectorAll(".form-content-login-button").forEach(btn => {

      if (state == loginStates.processing) {
        btn.className = "form-content-login-button form-content-login-button-processing"
      hitLogin();
      }
      else if (state == loginStates.normal) {
      
        btn.className = "form-content-login-button"

      }
    })
}
function loginPhone(state) {
   document.querySelectorAll(".form-content-login-button---phone").forEach(btn => {

      if (state == loginStates.processing) {
        btn.className = 'form-content-login-button---phone phone-login-processing'
      hitLogin();
      }
      else if (state == loginStates.normal) {
      
        btn.className = "form-content-login-button---phone"

      }
    })
}

function hitLogin() {
  // ajax here

  // on success
//    login(loginStates.normal)
// loginPhone(loginStates.normal)

}






function loginUniversal(state) {
    login(state)
    loginPhone(state)
  
  
}


function loginGoogle() {
  
}
function loginFacebook() {

}

function getData() {

  let data = {}
  let allEmails = document.querySelectorAll("#email");
 let emails = [... new Set(Array.from(allEmails).map(ele => ele.querySelector("input").value))];
 if (emails.length > 1) {
 let currentDevice = getCurrentDeviceType();
let currentDeviceEmail = Array.from(allEmails).filter(ae => ae.closest("if-block").getAttribute(currentDevice))
data.email = currentDeviceEmail;
 }
 else {
  data.email = emails[0];
 let inputType = allEmails[0].querySelector("main span").getAttribute("inputType");
 data.method = inputType;
 }
  let allPasswords = document.querySelectorAll("#password");
 let passwords = [... new Set(Array.from(allPasswords).map(ele => ele.querySelector("input").value))];
 if (passwords.length > 1) {
 let currentDevice = getCurrentDeviceType();
let currentDevicePassword = Array.from(allPasswords).filter(ae => ae.closest("if-block").getAttribute(currentDevice))
data.password = currentDevicePassword;
 }
 else {
  data.password = passwords[0];
 }

 console.log(data)
  

}

