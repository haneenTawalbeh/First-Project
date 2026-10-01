const API_URL = "http://localhost:3000/api/expenses";

const tableBody = document.getElementById("expensesTableBody");
const spinner = document.getElementById("spinner");

// filters and search
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const monthFilter = document.getElementById("monthFilter");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");

// theme
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");

// summary
const totalAmount = document.getElementById("totalAmount");
const expenseCount = document.getElementById("expenseCount");
const highestExpense = document.getElementById("highestExpense");

// forms
const addForm = document.getElementById("addExpenseForm");
const editForm = document.getElementById("editExpenseForm");

let allExpenses = [];
let sortColumn = null;
let sortDirection = "asc";

// Bootstrap Alert Helper
function showAlert(message, type = "danger") {
  const container = document.getElementById("alertContainer");

  const alert = document.createElement("div");
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.textContent = message;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn-close";
  closeButton.setAttribute("data-bs-dismiss", "alert");

  alert.appendChild(closeButton);
  container.innerHTML = ""; //delete the old message
  container.appendChild(alert);
}

// Load Expenses - GET
async function loadExpenses() {
  try {
    spinner.style.display = "block";

    const response = await fetch(API_URL);

    if (!response.ok) {
      let errorMessage = "Failed to load expenses.";
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // the response was not JSON
      }
      throw new Error(errorMessage);
    }

    allExpenses = await response.json();
    processAndDisplayData();
  } catch (error) {
    console.error(error);
    showAlert(
      error.message ||
        "Unable to connect to the server. Please make sure the backend is running.",
      "danger",
    );
  } finally {
    spinner.style.display = "none";
  }
}

// Process & Filter Data
function getFilteredAndSortedExpenses() {
  const selectedCategory = categoryFilter.value;
  const searchQuery = searchInput.value.trim().toLowerCase();
  const selectedMonth = monthFilter.value; // Format: "YYYY-MM"

  let result = [...allExpenses]; //new array do not refer to the original array address 

  // 1. Filter by Category
  if (selectedCategory !== "All") { 
    result = result.filter((expense) => expense.category === selectedCategory);
  }

  // 2. Search by Title
  if (searchQuery !== "") {
    result = result.filter((expense) =>
      expense.title.toLowerCase().includes(searchQuery),
    );
  }

  // 3. Filter by Month
  if (selectedMonth !== "") {
    result = result.filter((expense) => {
      if (!expense.date){
        return false;
      } 
      return expense.date.startsWith(selectedMonth);
    });
  }

  // 4. Sort Table Data
  if (sortColumn) {
    result.sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (sortColumn === "amount") {
        valA = Number(valA);
        valB = Number(valB);
      } else if (sortColumn === "date") {
        valA = new Date(valA);
        valB = new Date(valB);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  return result;
}

function processAndDisplayData() {
  const processedData = getFilteredAndSortedExpenses();
  updateSummary(processedData);
  displayExpenses(processedData);
}


// Display Expenses in DOM
function displayExpenses(expenses) {
  tableBody.innerHTML = ""; //clean table data before adding new data

  if (expenses.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" class="text-center text-muted py-3">No expenses found.</td>`;
    tableBody.appendChild(row);
    return;
  }

  expenses.forEach((expense) => {
    const row = document.createElement("tr");

    // Title
    const titleCell = document.createElement("td");
    titleCell.textContent = expense.title;

    // Amount
    const amountCell = document.createElement("td");
    amountCell.textContent = `$${Number(expense.amount).toFixed(2)}`;

    // Category
    const categoryCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge bg-primary";
    badge.textContent = expense.category;
    categoryCell.appendChild(badge);

    // Date
    const dateCell = document.createElement("td");
    dateCell.textContent = expense.date;

    // Edit Button
    const editCell = document.createElement("td");
    editCell.className = "text-center";
    const editButton = document.createElement("button");
    editButton.className = "btn btn-sm btn-warning";
    editButton.textContent = "Edit";
    editButton.setAttribute("data-bs-toggle", "modal");
    editButton.setAttribute("data-bs-target", "#editModal");

    editButton.addEventListener("click", () => {
      document.getElementById("editId").value = expense.id;
      document.getElementById("editTitle").value = expense.title;
      document.getElementById("editAmount").value = expense.amount;
      document.getElementById("editCategory").value = expense.category;
      document.getElementById("editDate").value = expense.date;
    });
    editCell.appendChild(editButton);

    // Delete Button
    const deleteCell = document.createElement("td");
    deleteCell.className = "text-center";
    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-sm btn-danger";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete this expense?")) return;

      try {
        const response = await fetch(`${API_URL}/${expense.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          let errorMessage = "Failed to delete expense.";
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            // Response was not JSON
          }
          throw new Error(errorMessage);
        }

        await loadExpenses();
        showAlert("Expense deleted successfully.", "success");
      } catch (error) {
        console.error(error);
        showAlert(error.message, "danger");
      }
    });

    deleteCell.appendChild(deleteButton);

    // Add Cells to Row
    row.appendChild(titleCell);
    row.appendChild(amountCell);
    row.appendChild(categoryCell);
    row.appendChild(dateCell);
    row.appendChild(editCell);
    row.appendChild(deleteCell);

    tableBody.appendChild(row);
  });
}


// Update Summary Cards
function updateSummary(expenses) {
  // Count
  expenseCount.textContent = expenses.length;

  // Total
  const total = expenses.reduce( 
    (sum, expense) => sum + Number(expense.amount),
    0,
  );
  totalAmount.textContent = `$${total.toFixed(2)}`;

  // Highest Expense
  if (expenses.length === 0) {
    highestExpense.textContent = "$0.00";
  } else {
    const highest = Math.max(
      ...expenses.map((expense) => Number(expense.amount)),
    );
    highestExpense.textContent = `$${highest.toFixed(2)}`;
  }
}


// Sorting Event Listeners
document.querySelectorAll(".sortable-header").forEach((header) => {
  header.addEventListener("click", () => {
    const column = header.getAttribute("data-sort");

    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }

    // Update Sorting Icons UI
    document.querySelectorAll(".sort-icon").forEach((icon) => {
      icon.className = "bi bi-arrow-down-up sort-icon";
    });

    const currentIcon = header.querySelector(".sort-icon");
    currentIcon.className =
      sortDirection === "asc"
        ? "bi bi-sort-up sort-icon"
        : "bi bi-sort-down sort-icon";

    processAndDisplayData();
  });
});


// Filter & Search Listeners
categoryFilter.addEventListener("change", processAndDisplayData);
searchInput.addEventListener("input", processAndDisplayData);
monthFilter.addEventListener("change", processAndDisplayData);

resetFiltersBtn.addEventListener("click", () => {
  categoryFilter.value = "All";
  searchInput.value = "";
  monthFilter.value = "";
  sortColumn = null;
  sortDirection = "asc";

  document.querySelectorAll(".sort-icon").forEach((icon) => {
    icon.className = "bi bi-arrow-down-up sort-icon";
  });

  processAndDisplayData();
});


// Export to CSV Function
exportCsvBtn.addEventListener("click", () => {
  const currentData = getFilteredAndSortedExpenses();

  if (currentData.length === 0) {
    showAlert("No expenses available to export.", "warning");
    return;
  }

  const headers = ["Title", "Amount", "Category", "Date"];
  const rows = currentData.map((e) => [
    `"${e.title.replace(/"/g, '""')}"`,
    e.amount,
    `"${e.category}"`,
    `"${e.date}"`,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `expenses_export_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});


// Light-Dark Mode Toggle
function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
  localStorage.setItem("theme", theme);

  if (theme === "dark") {
    themeIcon.className = "bi bi-sun-fill";
    themeText.textContent = "Light Mode";
  } else {
    themeIcon.className = "bi bi-moon-stars-fill";
    themeText.textContent = "Dark Mode";
  }
}

themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-bs-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
});

// Initialize Theme from localStorage
const savedTheme = localStorage.getItem("theme") || "dark";
applyTheme(savedTheme);


// Add Expense - POST
addForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  try {
    const title = document.getElementById("addTitle").value.trim();
    const amount = document.getElementById("addAmount").value;
    const category = document.getElementById("addCategory").value;
    const date = document.getElementById("addDate").value;

    if (!title) return showAlert("Title is required.", "danger");
    if (amount === "" || Number.isNaN(Number(amount)) || Number(amount) <= 0)
      return showAlert("Amount must be a number greater than zero.", "danger");
    if (!category) return showAlert("Please select a category.", "danger");
    if (!date) return showAlert("Date is required.", "danger");

    const newExpense = { title, amount: Number(amount), category, date };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExpense),
    });

    if (!response.ok) {
      let errorMessage = "Failed to add expense.";
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    await loadExpenses();
    addForm.reset();

    const addModalEl = document.getElementById("addModal");
    const addModal = bootstrap.Modal.getInstance(addModalEl);
    if (addModal) addModal.hide();

    showAlert("Expense added successfully.", "success");
  } catch (error) {
    console.error(error);
    showAlert(error.message, "danger");
  }
});


// Edit Expense - PUT
editForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  try {
    const id = document.getElementById("editId").value;
    const title = document.getElementById("editTitle").value.trim();
    const amount = document.getElementById("editAmount").value;
    const category = document.getElementById("editCategory").value;
    const date = document.getElementById("editDate").value;

    if (!title) return showAlert("Title is required.", "danger");
    if (amount === "" || Number.isNaN(Number(amount)) || Number(amount) <= 0)
      return showAlert("Amount must be a number greater than zero.", "danger");
    if (!category) return showAlert("Please select a category.", "danger");
    if (!date) return showAlert("Date is required.", "danger");

    const updatedExpense = { title, amount: Number(amount), category, date };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedExpense),
    });

    if (!response.ok) {
      let errorMessage = "Failed to update expense.";
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    await loadExpenses();

    const editModalEl = document.getElementById("editModal");
    const editModal = bootstrap.Modal.getInstance(editModalEl);
    if (editModal) editModal.hide();

    showAlert("Expense updated successfully.", "success");
  } catch (error) {
    console.error(error);
    showAlert(error.message, "danger");
  }
});

// Initialize App
loadExpenses();
