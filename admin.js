const { createClient } = supabase;

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let allRows = [];


// ==============================
// HELPER
// ==============================

const $ = id =>
  document.getElementById(id);


// ==============================
// LOGIN ERROR
// ==============================

function err(msg) {

  $("loginError").textContent = msg;

  $("loginError")
    .classList
    .remove("hidden");
}


// ==============================
// INITIALIZE
// ==============================

async function init() {

  const {
    data: {
      session
    }
  } = await supabaseClient.auth.getSession();

  if (session) {

    showDashboard(
      session.user
    );

  }

}


// ==============================
// SHOW DASHBOARD
// ==============================

function showDashboard(user) {

  $("loginCard")
    .classList
    .add("hidden");

  $("dashboard")
    .classList
    .remove("hidden");

  $("userEmail").textContent =
    user.email || "";

  loadRows();

}


// ==============================
// LOGIN
// ==============================

$("loginBtn").onclick =
  async () => {

    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInWithPassword({

            email:
              $("email")
                .value
                .trim(),

            password:
              $("password")
                .value

          });


      if (error) {

        throw error;

      }


      showDashboard(
        data.user
      );


    } catch (e) {

      err(
        e.message
      );

    }

  };


// ==============================
// LOGOUT
// ==============================

$("logoutBtn").onclick =
  async () => {

    await supabaseClient.auth
      .signOut();

    location.reload();

  };


// ==============================
// BUTTON EVENTS
// ==============================

$("refreshBtn").onclick =
  loadRows;


$("search").oninput =
  render;


$("filterStatus").onchange =
  render;


// ==============================
// LOAD DATA
// ==============================

async function loadRows() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("registrations")
      .select("*")
      .order(
        "submitted_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(error);

    return alert(
      error.message
    );

  }


  allRows =
    data || [];


  updateStats();

  render();

}


// ==============================
// UPDATE STATISTICS
// ==============================

function updateStats() {

  $("total").textContent =
    allRows.length;


  $("pending").textContent =
    allRows.filter(
      x =>
        x.registration_status ===
        "pending"
    ).length;


  $("approved").textContent =
    allRows.filter(
      x =>
        x.registration_status ===
        "approved"
    ).length;


  $("rejected").textContent =
    allRows.filter(
      x =>
        x.registration_status ===
        "rejected"
    ).length;

}


// ==============================
// RENDER TABLE
// ==============================

function render() {

  const q =
    $("search")
      .value
      .toLowerCase()
      .trim();


  const f =
    $("filterStatus")
      .value;


  const rows =
    allRows.filter(x => {

      const searchText = [

        x.registration_number,

        x.full_name,

        // LATIN NAME
        x.latin_name,

        x.school_name,

        x.province

      ]
        .join(" ")
        .toLowerCase();


      return (

        (!f ||
          x.registration_status === f)

        &&

        (!q ||
          searchText.includes(q))

      );

    });


  $("tbody").innerHTML =
    rows
      .map(x => `

        <tr>

          <td>
            ${escapeHtml(
              x.registration_number
            )}
          </td>


          <td>
            ${escapeHtml(
              x.full_name
            )}
          </td>


          <td>
            ${escapeHtml(
              x.latin_name || ""
            )}
          </td>


          <td>
            ${escapeHtml(
              x.gender
            )}
          </td>


          <td>
            ${escapeHtml(
              x.grade
            )}
          </td>


          <td>
            ${escapeHtml(
              x.school_name
            )}
          </td>


          <td>
            ${escapeHtml(
              x.province
            )}
          </td>


          <td>

            <span
              class="badge ${x.payment_status}"
            >

              ${escapeHtml(
                x.payment_status
              )}

            </span>

          </td>


          <td>

            <span
              class="badge ${x.registration_status}"
            >

              ${escapeHtml(
                x.registration_status
              )}

            </span>

          </td>


          <td>
            ${
              x.submitted_at
                ? new Date(
                    x.submitted_at
                  ).toLocaleString(
                    "km-KH"
                  )
                : ""
            }
          </td>


          <td>

            <button
              class="action view"
              onclick="viewReceipt('${x.id}')"
            >
              មើល
            </button>


            <button
              class="action approve"
              onclick="setStatus('${x.id}','approved')"
            >
              Approve
            </button>


            <button
              class="action reject"
              onclick="setStatus('${x.id}','rejected')"
            >
              Reject
            </button>

          </td>

        </tr>

      `)
      .join("");

}


// ==============================
// ESCAPE HTML
// ==============================

function escapeHtml(v = "") {

  return String(v)
    .replace(
      /[&<>"']/g,
      m => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      }[m])
    );

}


// ==============================
// APPROVE / REJECT
// ==============================

window.setStatus =
  async (
    id,
    status
  ) => {

    const row =
      allRows.find(
        x => x.id === id
      );


    if (!row) {

      return;

    }


    const {
      error
    } =
      await supabaseClient
        .from("registrations")
        .update({

          registration_status:
            status,

          payment_status:

            status === "approved"

              ? "approved"

              : status === "rejected"

                ? "rejected"

                : row.payment_status

        })
        .eq(
          "id",
          id
        );


    if (error) {

      return alert(
        error.message
      );

    }


    await loadRows();

  };


// ==============================
// VIEW RECEIPT
// ==============================

window.viewReceipt =
  async id => {

    const row =
      allRows.find(
        x => x.id === id
      );


    if (!row) {

      return;

    }


    const {
      data,
      error
    } =
      await supabaseClient.storage
        .from("receipts")
        .createSignedUrl(
          row.receipt_path,
          600
        );


    if (error) {

      return alert(
        error.message
      );

    }


    const isPdf =
      row.receipt_path
        .toLowerCase()
        .endsWith(".pdf");


    $("modalContent")
      .innerHTML = `

        <h2>
          ${escapeHtml(
            row.full_name
          )}
        </h2>


        <p>
          <strong>
            ឈ្មោះឡាតាំង:
          </strong>

          ${escapeHtml(
            row.latin_name || ""
          )}
        </p>


        <p>
          <strong>
            លេខ:
          </strong>

          ${escapeHtml(
            row.registration_number
          )}
        </p>


        <p>
          <strong>
            ភេទ:
          </strong>

          ${escapeHtml(
            row.gender
          )}
        </p>


        <p>
          <strong>
            ថ្នាក់:
          </strong>

          ${escapeHtml(
            row.grade
          )}
        </p>


        <p>
          <strong>
            សាលា:
          </strong>

          ${escapeHtml(
            row.school_name
          )}
        </p>


        <p>
          <strong>
            ខេត្ត:
          </strong>

          ${escapeHtml(
            row.province
          )}
        </p>


        ${
          isPdf

            ? `

              <p>

                <a
                  href="${data.signedUrl}"
                  target="_blank"
                  rel="noopener"
                >
                  បើក PDF វិក្កយបត្រ
                </a>

              </p>

            `

            : `

              <img
                class="receipt"
                src="${data.signedUrl}"
                alt="Receipt"
              >

            `
        }

      `;


    $("modal")
      .classList
      .remove("hidden");

  };


// ==============================
// CLOSE MODAL
// ==============================

$("closeModal").onclick =
  () =>
    $("modal")
      .classList
      .add("hidden");


// ==============================
// EXPORT CSV
// ==============================

$("exportBtn").onclick =
  () => {

    if (!allRows.length) {

      return alert(
        "មិនមានទិន្នន័យសម្រាប់ Export ទេ។"
      );

    }


    const headers = [

      "registration_number",

      "full_name",

      "latin_name",

      "gender",

      "grade",

      "school_name",

      "province",

      "payment_status",

      "registration_status",

      "submitted_at"

    ];


    const csv = [

      headers.join(","),

      ...allRows.map(r =>

        headers
          .map(h =>
            `"${String(
              r[h] ?? ""
            ).replaceAll(
              '"',
              '""'
            )}"`
          )
          .join(",")

      )

    ].join("\n");


    const blob =
      new Blob(
        [
          "\ufeff" +
          csv
        ],
        {
          type:
            "text/csv;charset=utf-8"
        }
      );


    const a =
      document.createElement(
        "a"
      );


    a.href =
      URL.createObjectURL(
        blob
      );


    a.download =
      "registrations.csv";


    a.click();


    URL.revokeObjectURL(
      a.href
    );

  };


// ==============================
// EXPORT EXCEL
// ==============================

$("exportExcelBtn").onclick = () => {

  if (!allRows.length) {
    alert("មិនមានទិន្នន័យសម្រាប់ Export ទេ។");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert("Excel library មិនបាន Load ទេ។ សូមពិនិត្យ Internet ឬ Script ក្នុង admin.html");
    return;
  }

  const data = allRows.map(r => ({
    "លេខចុះឈ្មោះ": r.registration_number || "",
    "ឈ្មោះជាខ្មែរ": r.full_name || "",
    "ឈ្មោះជាឡាតាំង": r.latin_name || "",
    "ភេទ": r.gender || "",
    "ថ្នាក់": r.grade || "",
    "ឈ្មោះសាលា": r.school_name || "",
    "រាជធានី/ខេត្ត": r.province || "",
    "ការបង់ប្រាក់": r.payment_status || "",
    "ស្ថានភាព": r.registration_status || "",
    "កាលបរិច្ឆេទ": r.submitted_at
      ? new Date(r.submitted_at).toLocaleString("km-KH")
      : ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 25 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 25 }
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Registrations"
  );

  XLSX.writeFile(
    workbook,
    "registrations.xlsx"
  );
};

// ==============================
// START
// ==============================

init();
