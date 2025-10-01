

      // Initialize PDF.js
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

      let pdfDoc = null;
      let pageNum = 1;
      let pageRendering = false;
      let pageNumPending = null;
      let canvas = document.getElementById("pdfCanvas");
      let ctx = canvas.getContext("2d");
      let scale = 1.0;
      let savedCoords = [];
      let tempPoint = null;

      // Get elements
      const fileInput = document.getElementById("fileInput");
      const selectedFileName = document.getElementById("selectedFileName");
      const pageNumInput = document.getElementById("pageNum");
      const pageCountSpan = document.getElementById("pageCount");
      const currentPageSpan = document.getElementById("currentPage");
      const prevPageButton = document.getElementById("prevPage");
      const nextPageButton = document.getElementById("nextPage");
      const xCoordSpan = document.getElementById("xCoord");
      const yCoordSpan = document.getElementById("yCoord");
      const coordsTableBody = document.getElementById("coordsTableBody");
      const copyButton = document.getElementById("copyButton");
      const crosshair = document.getElementById("crosshair");
      const verticalLine = crosshair.querySelector(".vertical");
      const horizontalLine = crosshair.querySelector(".horizontal");
      const pdfContainer = document.getElementById("pdfContainer");
      const workspace = document.getElementById("workspace");
      const noPdfMessage = document.getElementById("noPdfMessage");
      const pdfLoading = document.getElementById("pdfLoading");

      // Modal elements
      const namePointModal = document.getElementById("namePointModal");
      const pointNameInput = document.getElementById("pointNameInput");
      const saveNameBtn = document.getElementById("saveNameBtn");
      const cancelNameBtn = document.getElementById("cancelNameBtn");

      // Function to render the PDF page
      function renderPage(num) {
        pageRendering = true;
        pdfLoading.style.display = "block";

        // Get the page
        pdfDoc.getPage(num).then(function (page) {
          // Calculate viewport based on scale
          const viewport = page.getViewport({ scale: scale });

          // Set canvas dimensions
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Set crosshair dimensions
          crosshair.style.width = `${viewport.width}px`;
          crosshair.style.height = `${viewport.height}px`;

          // Render PDF page
          const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
          };

          const renderTask = page.render(renderContext);

          // Wait for rendering to finish
          renderTask.promise.then(function () {
            pageRendering = false;
            pdfLoading.style.display = "none";

            // If another page rendering is pending, render that page
            if (pageNumPending !== null) {
              renderPage(pageNumPending);
              pageNumPending = null;
            }

            // Draw saved points for this page
            drawPointsForCurrentPage();
          });
        });

        // Update page number input and current page display
        pageNumInput.value = num;
        currentPageSpan.textContent = num;
      }

      // Function to queue the next/previous page
      function queueRenderPage(num) {
        if (pageRendering) {
          pageNumPending = num;
        } else {
          renderPage(num);
        }
      }

      // Function to get PDF coordinates
      function getPdfCoordinates(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = canvas.height - (clientY - rect.top); // Invert Y-axis for PDF coordinates
        return {
          x: Math.round(x / scale),
          y: Math.round(y / scale),
          screenX: x,
          screenY: clientY - rect.top,
        };
      }

      // Function to draw points for the current page
      function drawPointsForCurrentPage() {
        // Remove all existing point markers
        const existingPoints = pdfContainer.querySelectorAll(".point-marker");
        existingPoints.forEach((point) => point.remove());

        // Add markers for points on the current page
        savedCoords.forEach((coord, index) => {
          if (coord.page === pageNum) {
            addPointMarker(
              coord.x * scale,
              canvas.height - coord.y * scale,
              index
            );
          }
        });
      }

      // Function to add point marker
      function addPointMarker(x, y, index) {
        const marker = document.createElement("div");
        marker.className = "point-marker";
        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;

        if (index !== undefined) {
          marker.title = savedCoords[index].name;
          marker.dataset.index = index;

          // Add click event to highlight the corresponding row
          marker.addEventListener("click", function (e) {
            e.stopPropagation();
            const rows = coordsTableBody.querySelectorAll("tr");
            rows.forEach((row) => (row.style.backgroundColor = ""));

            const rowIndex = parseInt(marker.dataset.index);
            const row = coordsTableBody.children[rowIndex];
            if (row) {
              row.style.backgroundColor = "rgba(14, 165, 233, 0.1)";
              row.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          });
        }

        pdfContainer.appendChild(marker);
        return marker;
      }

      // Function to open the name point modal
      function openNamePointModal(x, y) {
        namePointModal.style.display = "flex";
        pointNameInput.focus();

        // Store temporary coordinates
        tempPoint = {
          x: x,
          y: y,
          page: pageNum,
        };
      }

      // Function to close the name point modal
      function closeNamePointModal() {
        namePointModal.style.display = "none";
        pointNameInput.value = "";

        // Remove temporary point marker
        const tempMarker = pdfContainer.querySelector(
          ".point-marker:not([data-index])"
        );
        if (tempMarker) {
          tempMarker.remove();
        }

        tempPoint = null;
      }

      // Function to save the point with name
      function savePointWithName() {
        const fieldName = pointNameInput.value.trim();

        if (fieldName && tempPoint) {
          savedCoords.push({
            name: fieldName,
            page: tempPoint.page,
            x: tempPoint.x,
            y: tempPoint.y,
          });

          updateCoordsList();
          drawPointsForCurrentPage();
          closeNamePointModal();
        } else {
          alert("Please enter a valid field name.");
        }
      }

      // Function to update the coordinates list
      function updateCoordsList() {
        coordsTableBody.innerHTML = "";

        savedCoords.forEach((coord, index) => {
          const row = document.createElement("tr");

          const nameCell = document.createElement("td");
          nameCell.textContent = coord.name;

          const pageCell = document.createElement("td");
          pageCell.textContent = coord.page;

          const xCell = document.createElement("td");
          xCell.textContent = coord.x;

          const yCell = document.createElement("td");
          yCell.textContent = coord.y;

          const actionCell = document.createElement("td");
          const deleteButton = document.createElement("button");
          deleteButton.textContent = "Delete";
          deleteButton.className = "delete-btn";
          deleteButton.addEventListener("click", function (e) {
            e.stopPropagation();
            savedCoords.splice(index, 1);
            updateCoordsList();
            drawPointsForCurrentPage();
          });
          actionCell.appendChild(deleteButton);

          row.appendChild(nameCell);
          row.appendChild(pageCell);
          row.appendChild(xCell);
          row.appendChild(yCell);
          row.appendChild(actionCell);

          // Highlight row when clicking on it
          row.addEventListener("click", function () {
            const rows = coordsTableBody.querySelectorAll("tr");
            rows.forEach((r) => (r.style.backgroundColor = ""));
            row.style.backgroundColor = "rgba(14, 165, 233, 0.1)";

            // If the point is on current page, highlight it
            if (coord.page === pageNum) {
              const markers = pdfContainer.querySelectorAll(".point-marker");
              markers.forEach(
                (m) => (m.style.transform = "translate(-50%, -50%)")
              );

              const marker = pdfContainer.querySelector(
                `.point-marker[data-index="${index}"]`
              );
              if (marker) {
                marker.style.transform = "translate(-50%, -50%) scale(1.5)";
                marker.style.zIndex = "95";
                setTimeout(() => {
                  marker.style.transform = "translate(-50%, -50%)";
                  marker.style.zIndex = "90";
                }, 1000);
              }
            }
          });

          coordsTableBody.appendChild(row);
        });
      }

      // Previous page button
      prevPageButton.addEventListener("click", function () {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPage(pageNum);
      });

      // Next page button
      nextPageButton.addEventListener("click", function () {
        if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
        pageNum++;
        queueRenderPage(pageNum);
      });

      // Page number input
      pageNumInput.addEventListener("change", function () {
        const newPageNum = parseInt(pageNumInput.value);
        if (pdfDoc && newPageNum >= 1 && newPageNum <= pdfDoc.numPages) {
          pageNum = newPageNum;
          queueRenderPage(pageNum);
        } else {
          pageNumInput.value = pageNum;
        }
      });

      // Zoom level change


      // Canvas mouse move event
      canvas.addEventListener("mousemove", function (e) {
        const coords = getPdfCoordinates(e.clientX, e.clientY);
        xCoordSpan.textContent = coords.x;
        yCoordSpan.textContent = coords.y;

        // Update crosshair position
        crosshair.style.display = "block";
        verticalLine.style.left = `${coords.screenX}px`;
        horizontalLine.style.top = `${coords.screenY}px`;
      });

      // Canvas mouse out event
      canvas.addEventListener("mouseout", function () {
        crosshair.style.display = "none";
      });

      // Canvas click event - Add point
      canvas.addEventListener("click", function (e) {
        if (!pdfDoc) return;

        const coords = getPdfCoordinates(e.clientX, e.clientY);

        // Add temporary visual marker
        addPointMarker(coords.screenX, coords.screenY);

        // Open modal to name the point
        openNamePointModal(coords.x, coords.y);
      });

      // Save name button click
      saveNameBtn.addEventListener("click", savePointWithName);

      // Cancel button click
      cancelNameBtn.addEventListener("click", closeNamePointModal);

      // Modal keyboard events
      pointNameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          savePointWithName();
        } else if (e.key === "Escape") {
          closeNamePointModal();
        }
      });

      // Click outside modal to close
      namePointModal.addEventListener("click", function (e) {
        if (e.target === namePointModal) {
          closeNamePointModal();
        }
      });

      // Copy button
      copyButton.addEventListener("click", function () {
        if (savedCoords.length === 0) {
          alert("No coordinates to copy.");
          return;
        }

        // Create JavaScript object
        let coordsObj = "const FIELD_COORDINATES = {\n";

        savedCoords.forEach((coord) => {
          coordsObj += `  ${coord.name}: { x: ${coord.x}, y: ${coord.y}, page: ${coord.page} },\n`;
        });

        coordsObj += "};";

        // Copy to clipboard
        navigator.clipboard
          .writeText(coordsObj)
          .then(() => {
            copyButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Copied!
            `;
            setTimeout(() => {
              copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy as JavaScript Object
              `;
            }, 2000);
          })
          .catch((err) => alert("Failed to copy coordinates: " + err));
      });

      // File input change
      fileInput.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // Update file name display
        selectedFileName.textContent = file.name;

        // Show loading indicator
        pdfLoading.style.display = "block";

        // Show workspace, hide no PDF message
        workspace.style.display = "flex";
        noPdfMessage.style.display = "none";

        const reader = new FileReader();
        reader.onload = function (event) {
          const typedArray = new Uint8Array(event.target.result);

          // Load PDF
          pdfjsLib
            .getDocument(typedArray)
            .promise.then(function (pdf) {
              pdfDoc = pdf;
              pageNum = 1;
              pageNumInput.max = pdf.numPages;
              pageCountSpan.textContent = `/ ${pdf.numPages}`;
              renderPage(pageNum);
            })
            .catch(function (error) {
              console.error("Error loading PDF:", error);
              alert("Error loading PDF. Please try another file.");
              pdfLoading.style.display = "none";
            });
        };
        reader.readAsArrayBuffer(file);
      });

      // Initialize the UI
      function init() {
        // Hide workspace initially
        workspace.style.display = "none";
        noPdfMessage.style.display = "block";
      }

      // Run initialization
      init();
    