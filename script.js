
const API_BASE = 'https://archinspirestudio-backend.onrender.com';

let jwtToken = ''; // Will store JWT after login

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-form');
  const imageInput = document.getElementById('admin-images');
  const dropzone = document.getElementById('image-dropzone');
  const previewContainer = document.getElementById('image-previews');

  const loginModal = document.getElementById('login-modal');
  const loginBtn = document.getElementById('admin-login-button');
  const loginSubmit = document.getElementById('login-submit');
  const loginError = document.getElementById('login-error');

  let editor;
  ClassicEditor.create(document.querySelector('#admin-editor'))
    .then(newEditor => { editor = newEditor; })
    .catch(error => console.error(error));

  // Admin Login Button Click → Open Login Modal
  loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'block';
  });

  // Login Submission
  loginSubmit.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      jwtToken = data.token;
      loginModal.style.display = 'none';
      loginError.textContent = '';
      loadSubsections();
      alert('Login successful!');
    } else {
      loginError.textContent = 'Invalid credentials. Try again.';
    }
  });

  // Submit Admin Form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const section = document.getElementById('admin-section').value;
    const title = document.getElementById('admin-title').value;
    const content = editor.getData();
    const images = Array.from(document.querySelectorAll('.preview img')).map(img => img.src);

    const res = await fetch(`${API_BASE}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ section, title, content, images })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Subsection saved!');
      form.reset();
      editor.setData('');
      previewContainer.innerHTML = '';
      loadSubsections();
    } else {
      alert('Error saving subsection: ' + data.error);
    }
  });

  // Image Upload Handling
  imageInput.addEventListener('change', handleImageUpload);
  dropzone.addEventListener('click', () => imageInput.click());
  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    imageInput.files = e.dataTransfer.files;
    handleImageUpload({ target: imageInput });
  });

  async function handleImageUpload(event) {
    const files = event.target.files;
    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        const div = document.createElement('div');
        div.className = 'preview';
        div.innerHTML = `
          <img src="${data.imageUrl}" alt="Uploaded">
          <div class="figcaption-inputs">
            <input type="text" placeholder="Caption">
            <input type="color" value="#000000">
          </div>`;
        previewContainer.appendChild(div);
      } else {
        alert("Image upload failed.");
      }
    }
  }

  async function loadSubsections() {
    const res = await fetch(`${API_BASE}/api/posts`);
    const data = await res.json();
    const manageList = document.getElementById('manage-list');
    manageList.innerHTML = '';

    data.forEach(post => {
      const div = document.createElement('div');
      div.className = 'preview';
      div.innerHTML = `
        <strong>${post.title}</strong>
        <p>Section: ${post.section}</p>
        <div>${post.content.slice(0, 100)}...</div>
      `;
      manageList.appendChild(div);
    });
  }
});


document.addEventListener("DOMContentLoaded", () => {
  // Element References
  const adminLoginButton = document.getElementById("admin-login-button");
  const adminPanel = document.getElementById("admin-panel");
  const adminClose = document.getElementById("admin-close");
  const adminForm = document.getElementById("admin-form");
  const manageList = document.getElementById("manage-list");
  const sidebarList = document.getElementById("sidebar-list");
  const dynamicSidebar = document.getElementById("dynamic-sidebar");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const fullpageOverlay = document.getElementById("fullpage-overlay");
  const fullpageContent = document.getElementById("fullpage-content");
  const globalSearch = document.getElementById("global-search");
  const searchSuggestions = document.getElementById("search-suggestions");

  // Drag & Drop elements for images
  const imageDropzone = document.getElementById("image-dropzone");
  const adminImagesInput = document.getElementById("admin-images");
  const imagePreviews = document.getElementById("image-previews");

  // Global data arrays
  let subsections = [];
  // imagesData: array of objects { url, file, caption, captionFont, captionColor }
  let imagesData = [];
  // For edit functionality: store the id of the subsection being edited (null if adding new)
  let currentEditId = null;

  // Initialize CKEditor for rich text editing with Live Preview
  let editorInstance;
  ClassicEditor
    .create(document.querySelector('#admin-editor'), {
      toolbar: [
        'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote',
        'undo', 'redo'
      ]
    })
    .then(editor => {
      editorInstance = editor;
      // Live Preview: update on change
      editor.model.document.on('change:data', () => {
        document.getElementById("live-preview").innerHTML = editorInstance.getData();
      });
    })
    .catch(error => {
      console.error(error);
    });

  // Show/Hide Admin Panel
  adminLoginButton.addEventListener("click", () => {
    adminPanel.setAttribute("aria-hidden", "false");
  });
  adminClose.addEventListener("click", () => {
    adminPanel.setAttribute("aria-hidden", "true");
    resetAdminForm();
  });

  // Drag & Drop for Images with individual figcaption inputs
  imageDropzone.addEventListener("click", () => {
    adminImagesInput.click();
  });
  adminImagesInput.addEventListener("change", handleFiles);
  imageDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    imageDropzone.classList.add("dragover");
  });
  imageDropzone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    imageDropzone.classList.remove("dragover");
  });
  imageDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    imageDropzone.classList.remove("dragover");
    handleFiles({ target: { files: e.dataTransfer.files } });
  });

  function handleFiles(e) {
    const files = e.target.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgUrl = event.target.result;
        const imageObj = { url: imgUrl, file, caption: "", captionFont: "", captionColor: "#000000" };
        imagesData.push(imageObj);
        // Create preview with individual figcaption inputs
        const imgPreview = document.createElement("div");
        imgPreview.className = "preview";
        imgPreview.innerHTML = `
          <img src="${imgUrl}" alt="preview">
          <p>Click to remove</p>
          <div class="figcaption-inputs">
            <input type="text" placeholder="Figcaption" value="">
            <input type="text" placeholder="Font (e.g., Arial)" value="">
            <input type="color" value="#000000">
          </div>
        `;
        const [capInput, fontInput, colorInput] = imgPreview.querySelectorAll(".figcaption-inputs input");
        capInput.addEventListener("input", () => { imageObj.caption = capInput.value; });
        fontInput.addEventListener("input", () => { imageObj.captionFont = fontInput.value; });
        colorInput.addEventListener("input", () => { imageObj.captionColor = colorInput.value; });
        imgPreview.addEventListener("click", (e) => {
          if (e.target.tagName.toLowerCase() === "input") return;
          imagePreviews.removeChild(imgPreview);
          imagesData = imagesData.filter(item => item.url !== imgUrl);
        });
        imagePreviews.appendChild(imgPreview);
      };
      reader.readAsDataURL(file);
    }
  }

  // Handle Admin Form Submission (Add or Update)
  adminForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const section = document.getElementById("admin-section").value;
    const title = document.getElementById("admin-title").value.trim();
    const content = editorInstance.getData();
    // Map imagesData to an array of image objects with individual figcaption settings
    const images = imagesData.map(item => ({ 
      url: item.url, 
      caption: item.caption, 
      captionFont: item.captionFont, 
      captionColor: item.captionColor 
    }));
    
    const newSubsection = {
      id: currentEditId ? currentEditId : Date.now(),
      section,
      title,
      description: content,
      imageUrls: images
    };
    
    if (currentEditId) {
      subsections = subsections.map(sub => sub.id === currentEditId ? newSubsection : sub);
    } else {
      subsections.push(newSubsection);
    }
    updateManageList();
    saveSubsections();
    resetAdminForm();
  });

  function resetAdminForm() {
    adminForm.reset();
    editorInstance.setData("");
    imagesData = [];
    imagePreviews.innerHTML = "";
    currentEditId = null;
    document.getElementById("admin-submit").innerText = "Add Subsection";
  }

  // Update Manage List in Admin Panel (with Edit and Delete)
  function updateManageList() {
    manageList.innerHTML = "";
    subsections.forEach(sub => {
      const item = document.createElement("div");
      item.className = "manage-item";
      item.setAttribute("data-id", sub.id);
      item.innerHTML = `<strong>${sub.title}</strong> (${sub.section})
                        <button data-id="${sub.id}" class="edit-btn">Edit</button>
                        <button data-id="${sub.id}" class="delete-btn">Delete</button>`;
      manageList.appendChild(item);
    });
    attachManageListListeners();
  }

  function attachManageListListeners() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = Number(e.target.getAttribute("data-id"));
        subsections = subsections.filter(sub => sub.id !== id);
        updateManageList();
        saveSubsections();
      });
    });
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = Number(e.target.getAttribute("data-id"));
        const sub = subsections.find(item => item.id === id);
        if (sub) {
          currentEditId = sub.id;
          document.getElementById("admin-section").value = sub.section;
          document.getElementById("admin-title").value = sub.title;
          editorInstance.setData(sub.description);
          imagesData = [];
          imagePreviews.innerHTML = "";
          sub.imageUrls.forEach(img => {
            imagesData.push({ 
              url: img.url, 
              file: null, 
              caption: img.caption, 
              captionFont: img.captionFont, 
              captionColor: img.captionColor 
            });
            const imgPreview = document.createElement("div");
            imgPreview.className = "preview";
            imgPreview.innerHTML = `
              <img src="${img.url}" alt="preview">
              <p>Click to remove</p>
              <div class="figcaption-inputs">
                <input type="text" placeholder="Figcaption" value="${img.caption}">
                <input type="text" placeholder="Font (e.g., Arial)" value="${img.captionFont}">
                <input type="color" value="${img.captionColor}">
              </div>
            `;
            const [capInput, fontInput, colorInput] = imgPreview.querySelectorAll(".figcaption-inputs input");
            capInput.addEventListener("input", () => { imagesData[imagesData.length - 1].caption = capInput.value; });
            fontInput.addEventListener("input", () => { imagesData[imagesData.length - 1].captionFont = fontInput.value; });
            colorInput.addEventListener("input", () => { imagesData[imagesData.length - 1].captionColor = colorInput.value; });
            imgPreview.addEventListener("click", (e) => {
              if (e.target.tagName.toLowerCase() === "input") return;
              imagePreviews.removeChild(imgPreview);
              imagesData = imagesData.filter(item => item.url !== img.url);
            });
            imagePreviews.appendChild(imgPreview);
          });
          document.getElementById("admin-submit").innerText = "Update Subsection";
          adminPanel.setAttribute("aria-hidden", "false");
        }
      });
    });
  }

  // Open Creative Modal Overlay for detailed subsection view with sticky close button and lazy loading for images
  function openSubsection(sub) {
    fullpageContent.innerHTML = `
      <div class="modal-header">
        <h2>${sub.title}</h2>
        <button class="modal-close" aria-label="Close Modal">&times;</button>
      </div>
      <div class="modal-body">
        <div id="subsection-description">${sub.description}</div>
        ${sub.imageUrls && sub.imageUrls.length > 0 ? `
          <div id="main-image-display">
            ${sub.imageUrls.map(img => `<figure>
              <a href="${img.url}" class="glightbox">
                <img src="${img.url}" alt="${sub.title} Image" loading="lazy" />
              </a>
              <figcaption style="font-family: ${img.captionFont || 'inherit'}; color: ${img.captionColor || 'inherit'};">
                ${img.caption || ''}
              </figcaption>
            </figure>`).join('')}
          </div>` : ''}
      </div>
    `;
    fullpageOverlay.classList.add("active");
    fullpageOverlay.setAttribute("aria-hidden", "false");
    // Trap focus within modal for accessibility
    trapFocus(fullpageContent);
    const firstFocusable = fullpageContent.querySelector(".modal-close");
    if (firstFocusable) firstFocusable.focus();
    fullpageContent.querySelector(".modal-close").addEventListener("click", () => {
      fullpageOverlay.classList.remove("active");
      fullpageOverlay.setAttribute("aria-hidden", "true");
    });
    GLightbox({ selector: '.glightbox' });
  }

  // Focus trapping function for modal overlay
  function trapFocus(element) {
    const focusable = element.querySelectorAll('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]');
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    element.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    });
  }

  // Open Dynamic Sidebar for a Main Section (list only names)
  function openSidebarForSection(sectionName) {
    const filtered = subsections.filter(sub => sub.section === sectionName);
    sidebarList.innerHTML = "";
    if (filtered.length === 0) {
      sidebarList.innerHTML = `<li>No subsections available for this section.</li>`;
    } else {
      filtered.forEach(sub => {
        const li = document.createElement("li");
        li.innerText = sub.title;
        li.addEventListener("click", () => openSubsection(sub));
        sidebarList.appendChild(li);
      });
    }
    dynamicSidebar.classList.add("active");
    dynamicSidebar.setAttribute("aria-hidden", "false");
  }

  // Close Dynamic Sidebar
  closeSidebarBtn.addEventListener("click", () => {
    dynamicSidebar.classList.remove("active");
    dynamicSidebar.setAttribute("aria-hidden", "true");
  });

  // Attach click event to Main Sections to open sidebar with related subsection names
  document.querySelectorAll(".main-section").forEach(section => {
    section.addEventListener("click", () => {
      const sectionName = section.getAttribute("data-section");
      openSidebarForSection(sectionName);
    });
  });

  // Global Search Functionality
  globalSearch.addEventListener("input", () => {
    const query = globalSearch.value.toLowerCase();
    searchSuggestions.innerHTML = "";
    if (query.length === 0) return;
    const results = [];
    document.querySelectorAll(".main-section").forEach(section => {
      if (section.textContent.toLowerCase().includes(query)) {
        const heading = section.querySelector("h3")
          ? section.querySelector("h3").textContent
          : section.textContent;
        results.push({ text: heading, element: section });
      }
    });
    subsections.forEach(sub => {
      if (sub.title.toLowerCase().includes(query)) {
        results.push({ text: sub.title, subsection: sub });
      }
    });
    results.forEach(result => {
      const li = document.createElement("li");
      li.textContent = result.text;
      li.addEventListener("click", () => {
        if (result.element) {
          const sectionName = result.element.getAttribute("data-section");
          openSidebarForSection(sectionName);
        } else if (result.subsection) {
          openSubsection(result.subsection);
        }
        searchSuggestions.innerHTML = "";
      });
      searchSuggestions.appendChild(li);
    });
  });

  // Close Modal Overlay when clicking outside the content
  fullpageOverlay.addEventListener("click", (e) => {
    if (e.target === fullpageOverlay) {
      fullpageOverlay.classList.remove("active");
      fullpageOverlay.setAttribute("aria-hidden", "true");
    }
  });

  // Persistence: Load and Save subsections
  function loadSubsections() {
    const stored = localStorage.getItem("subsections");
    if (stored) {
      try {
        subsections = JSON.parse(stored);
        updateManageList();
      } catch (error) {
        console.error("Error parsing stored subsections", error);
      }
    }
  }
  function saveSubsections() {
    localStorage.setItem("subsections", JSON.stringify(subsections));
  }
  loadSubsections();
  window.addEventListener("beforeunload", saveSubsections);

  // Initialize SortableJS on the Manage List for drag-and-drop reordering
  Sortable.create(manageList, {
    animation: 150,
    onEnd: function (evt) {
      const newOrderIds = Array.from(manageList.children).map(child => Number(child.getAttribute("data-id")));
      subsections.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
      saveSubsections();
    }
  });
});
