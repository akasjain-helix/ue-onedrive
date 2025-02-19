function constructPayload(form) {
  const payload = {};
  [...form.elements].forEach((fe) => {
    if (fe.type !== "fieldset" && fe.name) {
      if (fe.type === "radio") {
        if (fe.checked) payload[fe.name] = fe.value;
      } else if (fe.type === "checkbox") {
        if (fe.checked)
          payload[fe.name] = payload[fe.name]
            ? `${payload[fe.name]},${fe.value}`
            : fe.value;
      } else {
        payload[fe.name] = fe.value;
      }
    }
  });
  return payload;
}

async function submitForm(form) {
  const payload = constructPayload(form);
  const resp = await fetch(form.dataset.action, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: payload }),
  });
  await resp.text();

  return payload;
}

async function handleSubmit(form, redirectTo) {
  if (form.getAttribute("data-submitting") !== "true") {
    form.setAttribute("data-submitting", "true");
    await submitForm(form);
    window.location.href = redirectTo || "/forms/thankyou";
  }
}

function setPlaceholder(element, fd) {
  if (fd.Placeholder) {
    element.setAttribute("placeholder", fd.Placeholder);
  }
}

function setNumberConstraints(element, fd) {
  if (fd.Max) {
    element.max = fd.Max;
  }
  if (fd.Min) {
    element.min = fd.Min;
  }
  if (fd.Step) {
    element.step = fd.Step || 1;
  }
}
function createLabel(fd, tagName = "label") {
  const label = document.createElement(tagName);
  label.setAttribute("for", fd.Id);
  label.className = "field-label";
  label.textContent = fd.Label || "";
  if (fd.Type !== 'radio') {
    label.setAttribute('itemprop', 'Label');
    label.setAttribute('itemtype', 'text');
  }
  if (fd.Tooltip) {
    label.title = fd.Tooltip;
  }
  if (fd.Mandatory && fd.Mandatory.toLowerCase() === "true") {
    const requiredTextSpan = document.createElement("span");
    requiredTextSpan.className = "required-text";
    requiredTextSpan.textContent = "  *";
    label.append(requiredTextSpan);
  }

  return label;
}

function createHelpText(fd) {
  const div = document.createElement("div");
  div.className = "field-description";
  div.setAttribute("aria-live", "polite");
  div.setAttribute('itemtype', 'text');
  div.setAttribute('itemprop', 'Description');
  div.innerText = fd.Description;
  div.id = `${fd.Id}-description`;
  return div;
}

function createFieldWrapper(fd, tagName = "div") {
  const fieldWrapper = document.createElement(tagName);
  if (fd.Type !== 'radio') {
    fieldWrapper.setAttribute('itemtype', 'component');
    fieldWrapper.setAttribute('itemid', generateItemId(fd.Name));
    fieldWrapper.setAttribute('itemscope', '');
  }
  const nameStyle = fd.Name ? ` form-${fd.Name}` : "";
  const fieldId = `form-${fd.Type}-wrapper${nameStyle}`;
  fieldWrapper.className = fieldId;
  fieldWrapper.dataset.fieldset = fd.Fieldset ? fd.Fieldset : "";
  fieldWrapper.classList.add("field-wrapper");
  fieldWrapper.append(createLabel(fd));
  return fieldWrapper;
}

function createButton(fd) {
  const wrapper = createFieldWrapper(fd);
  const button = document.createElement("button");
  button.textContent = fd.Label;
  button.type = fd.Type;
  button.classList.add("button");
  button.dataset.redirect = fd.Extra || "";
  button.id = fd.Id;
  button.name = fd.Name;
  wrapper.replaceChildren(button);
  return wrapper;
}

function createInput(fd) {
  const input = document.createElement("input");
  input.type = fd.Type;
  setPlaceholder(input, fd);
  setNumberConstraints(input, fd);
  return input;
}

const withFieldWrapper = (element) => (fd) => {
  const wrapper = createFieldWrapper(fd);
  wrapper.append(element(fd));
  return wrapper;
};

const createTextArea = withFieldWrapper((fd) => {
  const input = document.createElement("textarea");
  setPlaceholder(input, fd);
  return input;
});

const createSelect = withFieldWrapper((fd) => {
  const select = document.createElement("select");
  if (fd.Placeholder) {
    const ph = document.createElement("option");
    ph.textContent = fd.Placeholder;
    ph.setAttribute("disabled", "");
    ph.setAttribute("selected", "");
    select.append(ph);
  }
  fd.Options.split(",").forEach((o) => {
    const option = document.createElement("option");
    option.textContent = o.trim();
    option.value = o.trim();
    select.append(option);
  });
  select.selectedIndex = 0;
  return select;
});

function createRadio(fd) {
  const wrapper = createFieldWrapper(fd);
  wrapper.insertAdjacentElement("afterbegin", createInput(fd));
  return wrapper;
}

const createOutput = withFieldWrapper((fd) => {
  const output = document.createElement("output");
  output.name = fd.Name;
  output.dataset.fieldset = fd.Fieldset ? fd.Fieldset : "";
  output.innerText = fd.Value;
  return output;
});

function createHidden(fd) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.id = fd.Id;
  input.name = fd.Name;
  input.value = fd.Value;
  return input;
}

function createLegend(fd) {
  return createLabel(fd, "legend");
}

function createFieldSet(fd) {
  const wrapper = createFieldWrapper(fd, "fieldset");
  wrapper.name = fd.Name;
  //   wrapper.replaceChildren(createLegend(fd));
  return wrapper;
}

function groupFieldsByFieldSet(form) {
  const fieldsets = form.querySelectorAll("fieldset");
  fieldsets?.forEach((fieldset) => {
    const fields = form.querySelectorAll(`[data-fieldset="${fieldset.name}"`);
    fields?.forEach((field) => {
      fieldset.append(field);
    });
    if (fieldset.getAttribute("required") !== null) {
      fieldset.append(createErrorText(fieldset));
    }
  });
}

function createPlainText(fd) {
  const paragraph = document.createElement("p");
  const nameStyle = fd.Name ? `form-${fd.Name}` : "";
  paragraph.className = nameStyle;
  paragraph.dataset.fieldset = fd.Fieldset ? fd.Fieldset : "";
  paragraph.textContent = fd.Label;
  return paragraph;
}

const getId = (function getId() {
  const ids = {};
  return (name) => {
    ids[name] = ids[name] || 0;
    const idSuffix = ids[name] ? `-${ids[name]}` : "";
    ids[name] += 1;
    return `${name}${idSuffix}`;
  };
})();

const fieldRenderers = {
  radio: createRadio,
  checkbox: createRadio,
  submit: createButton,
  textarea: createTextArea,
  select: createSelect,
  button: createButton,
  output: createOutput,
  hidden: createHidden,
  fieldset: createFieldSet,
  plaintext: createPlainText,
};

function renderField(fd) {
  const renderer = fieldRenderers[fd.Type.toLowerCase()];
  let field;
  if (typeof renderer === "function") {
    field = renderer(fd);
  } else {
    field = createFieldWrapper(fd);
    field.append(createInput(fd));
  }
  if (fd.Description) {
    field.append(createHelpText(fd));
  }
  return field;
}

function createErrorText(fd) {
  const div = document.createElement("div");
  div.className = "field-required-error";
  div.innerText =
    fd.Type === "submit"
      ? "Fill the required fields"
      : "This field is required";
  div.id = `${fd.Id}-error-text`;
  return div;
}

async function fetchData(url) {
  const resp = await fetch(url);
  const json = await resp.json();
  return json.data.map((fd) => ({
    ...fd,
    Id: fd.Id || getId(fd.Name),
    Value: fd.Value || "",
  }));
}

async function fetchForm(pathname) {
  // get the main form
  const jsonData = await fetchData(pathname);
  return jsonData;
}

async function createForm(formURL) {
  const { pathname } = new URL(formURL);
  window.formPath = pathname;
  const data = await fetchForm(pathname);
  const form = document.createElement("form");
  form.noValidate = true;
  data.forEach((fd) => {
    const el = renderField(fd);
    const input = el.querySelector("input,textarea,select");
    if (fd.Type === "submit") {
      el.append(createErrorText(fd));
    }
    if (fd.Mandatory && fd.Mandatory.toLowerCase() === "true") {
      if (input !== null) {
        input.setAttribute("required", "required");
        el.append(createErrorText(fd));
      } else {
        el.setAttribute("required", "required");
      }
    }
    if (input) {
      input.id = fd.Id;
      input.name = fd.Name;
      input.value = fd.Value;
      if (fd.Description) {
        input.setAttribute("aria-describedby", `${fd.Id}-description`);
      }
    }
    form.append(el);
  });
  groupFieldsByFieldSet(form);
  // eslint-disable-next-line prefer-destructuring
  form.dataset.action = pathname.split(".json")[0];
  form.addEventListener("submit", (event) =>
    formsubmissionHandler(form, event)
  );
  return form;
}

function formsubmissionHandler(form, e) {
  e.preventDefault();
  if (validateFormElements(form)) {
    e.submitter.setAttribute("disabled", "");
    handleSubmit(form, e.submitter.dataset?.redirect);
  } else {
    const submitField = document.querySelector("button[type=submit]");
    submitField.parentElement.lastElementChild.style.display = "block";
    setTimeout(() => {
      document
        .querySelectorAll(".field-required-error")
        .forEach((errorElement) => {
          errorElement.style.display = "none";
        });
    }, 5000);
  }
}

function validateFormElements(form) {
  let validate = true;
  [...form.elements].forEach((fe) => {
    let isRequired = fe.getAttribute("required") === "required";
    if (isRequired) {
      if (fe.type === "fieldset") {
        let inputElements = fe.querySelectorAll("input");
        let isEmp = true;
        for (let ele of inputElements) {
          if (ele.checked === true) {
            isEmp = false;
            break;
          }
        }
        if (isEmp) {
          fe.lastElementChild.style.display = "block";
          validate = false;
        }
      } else if (fe.value.trim() === "") {
        fe.parentElement.lastElementChild.style.display = "block";
        validate = false;
      }
    }
  });

  return validate;
}

function topFormExpressBox() {
  const formExpressBoxDiv = document.createElement("div");
  formExpressBoxDiv.className = "neeraj";
  return formExpressBoxDiv;
}

function generateItemId(name) {
  if (name) {
    return `urn:fnkconnection:${window.formPath}:default:Name:${name}`;
  } else {
    return `urn:fnkconnection:${window.formPath}:default`;
  }
}

export default async function decorate(block) {
  block.setAttribute('itemtype', 'urn:fnk:type/form');
  const formLink = block.querySelector('a[href$=".json"]');
  if (formLink) {
    const form = await createForm(formLink.href);
    form.setAttribute('itemtype', 'container');
    form.setAttribute('itemid', generateItemId());
    form.setAttribute('itemscope', '');
    block.setAttribute('itemid', generateItemId());
    formLink.replaceWith(form);
  }
}
