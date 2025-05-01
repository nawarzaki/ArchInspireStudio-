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
  let imagesData = [];
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
  adminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const section = document.getElementById("admin-section").value;
    const title = document.getElementById("admin-title").value.trim();
    const content = editorInstance.getData();
    const images = imagesData.map(item => ({ 
      url: item.url, 
      caption: item.caption, 
      captionFont: item.captionFont, 
      captionColor: item.captionColor 
    }));
    
    const newSubsection = {
      section,
      title,
      description: content,
      imageUrls: images
    };
    
    try {
      const method = currentEditId ? "PUT" : "POST";
      const endpoint = currentEditId
        ? `https://archinspirestudio-backend.onrender.com/api/subsections/${currentEditId}`
        : `https://archinspirestudio-backend.onrender.com/api/subsections`;
      
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubsection),
      });

      if (!res.ok) throw new Error("Failed to save subsection");
      alert("Subsection saved successfully!");
      loadSubsections();
      resetAdminForm();
    } catch (err) {
      console.error(err);
      alert("Failed to save subsection");
    }
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
  async function updateManageList() {
    try {
      const res = await fetch("https://archinspirestudio-backend.onrender.com/api/subsections");
      subsections = await res.json();
      manageList.innerHTML = "";
      subsections.forEach(sub => {
        const item = document.createElement("div");
        item.className = "manage-item";
        item.setAttribute("data-id", sub._id);
        item.innerHTML = `<strong>${sub.title}</strong> (${sub.section})
                          <button data-id="${sub._id}" class="edit-btn">Edit</button>
                          <button data-id="${sub._id}" class="delete-btn">Delete</button>`;
        manageList.appendChild(item);
      });
      attachManageListListeners();
    } catch (err) {
      console.error("Failed to load subsections:", err);
    }
  }

  function attachManageListListeners() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        try {
          const res = await fetch(`https://archinspirestudio-backend.onrender.com/api/subsections/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            alert("Subsection deleted successfully!");
            loadSubsections();
          } else {
            alert("Failed to delete subsection.");
          }
        } catch (err) {
          console.error("Error deleting subsection:", err);
          alert("Error deleting subsection.");
        }
      });
    });
    
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        const sub = subsections.find(item => item._id === id);
        if (sub) {
          currentEditId = sub._id;
          document.getElementById("admin-section").value = sub.section;
          document.getElementById("admin-title").value = sub.title;
          editorInstance.setData(sub.description);
          imagesData = [];
          imagePreviews.innerHTML = "";
          sub.imageUrls.forEach(img => {
            imagesData.push({ 
              url: img.url, 
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

  // Load subsections on page load
  loadSubsections();
});
