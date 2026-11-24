# SOP: Setting up a City Admin (Super Admin guide)

**Who this is for:** Super Admin staff.
**What it covers:** giving each brand its own administrator (a "City Admin") who can sign in and manage only that brand's city.

---

## Before you start
- You need to be signed in to the **Super Admin panel**.
- Each brand can have **one active City Admin**.
- Have the admin's details ready: full name, email, 10-digit mobile number. A username is optional.
- The brand must have its **city** filled in. If it does not, the page tells you to set the city first.

---

## A. Set up an admin for a brand that already exists

1. Open **Business Brands** in the Super Admin sidebar.
2. Find the brand. Each brand card shows a status:
   - **Admin pending**: no admin yet.
   - **Admin configured**: an active admin exists.
   - **Admin inactive**: an admin exists but the account is switched off.
   Tip: use the **"All Brands (admin)"** filter to list only the brands that are pending.
3. Click **Configure Admin** on the brand card. (It says **View Admin** or **Edit Admin** when one already exists.)
4. The brand's Edit page opens on **5. City Admin & Login**. You will see the brand name, code and city.
5. If it says **City Admin Not Configured**, click **+ Create City Admin**.
6. Fill in:
   - **Admin full name**, **email**, **mobile number**, **username** (optional)
   - **Generate a temporary password**: leave this ticked (recommended)
   - **Account status**: Active
   - **Permissions**: tick what this admin may use (sellers, customers, products, inventory, orders, delivery partners, employees, finance, notifications)
7. Click **Create City Admin**.
8. A yellow box shows the **temporary password**.
   - **Copy it now.** It is shown only once and cannot be viewed again.
   - Give it to the admin through a safe channel (phone call or private message).
   - Click **Done**.

---

## B. Create the admin while creating a new brand

1. Open **Business Brands → Create Brand**.
2. Fill in sections 1 to 4 as usual.
3. Open **5. City Admin & Login** and choose:
   - **Create City Admin Now**: fill in the admin's details (as in step 6 above). The brand and admin are created together.
   - **Configure Admin Later**: the brand is created without an admin and shows **Admin pending**. You can finish it later using Section A.
4. Click **Create Business Brand**.
5. If you chose a generated password, it appears once on the page. Copy it before you continue.

---

## C. What the admin does

1. Open **`<your site>/city-admin/login`** (on your local setup: `http://localhost:3000/city-admin/login`).
2. Sign in with the **email (or username)** and the **temporary password**.
3. The page asks for a **new password**. It must have at least 8 characters, a letter and a number.
4. After saving, the admin lands in the Admin panel. They see **only their own brand's** data, and only the areas you gave them.

---

## D. Everyday tasks (Edit Brand → 5. City Admin & Login)

| I want to... | Click | What happens |
|---|---|---|
| See account history | **View admin details** | Shows who created or changed the account and when |
| Fix a name, mobile, email or username | **Edit admin details** → **Save details** | Saved at once. Changing the **email signs the admin out** |
| Admin forgot their password | **Reset password** | Generates a new temporary password (shown once). The admin is **signed out everywhere** and must choose a new password at the next login |
| Stop someone from signing in | **Deactivate account** | The admin is signed out **immediately** and cannot sign in. The brand shows **Admin inactive** |
| Let them back in | **Activate account** | They can sign in again |
| Change what they can access | **Update permissions** → **Save permissions** | Takes effect on their very next click, no new sign-in needed |

Changes in this section save immediately. You do **not** need to press "Update Business Brand".

---

## E. When an admin leaves or changes

1. Open the brand's **5. City Admin & Login**.
2. Click **Deactivate account** for the old admin.
3. Create the new admin: click **+ Create City Admin** and follow Section A, step 6.
   Because the old account is inactive, the brand can have a new active admin.
4. The old admin stays visible under **Previous admins** for your records.

---

## F. Rules to remember
- One active City Admin per brand.
- A City Admin cannot see or change another brand's data, even by changing a link.
- A City Admin cannot open Super Admin pages or manage other admins.
- Never share the temporary password in a group chat. If it is ever exposed, use **Reset password**.
- Passwords are never shown again after the first time and are stored securely.

---

## G. Troubleshooting

| What you see | Meaning | What to do |
|---|---|---|
| "This brand has no city saved" | The brand has no city | Open the brand, fill in **Operating City**, save, then create the admin |
| "An admin account with this email already exists" | The email is used by another admin | Use a different email |
| "This brand already has an active City Admin" | One active admin per brand | Deactivate the current one first |
| Admin sees "Invalid login or password" | Wrong email or password (case matters) | Check the email. Use **Reset password** if needed |
| Admin sees "account is inactive" | Account is switched off | Click **Activate account** |
| Admin says a page is "not permitted" | The area is not ticked in permissions | Use **Update permissions** |
| Admin was sent to the City Admin login with a message | They signed in with a temporary password | Sign in at `/city-admin/login` and set a new password |
| You cannot log out of the Admin panel | A leftover Super Admin login in the same browser | Logging out now ends both. Use a separate browser or an incognito window if you need both open |

---

## H. Quick checklist (new admin)
- [ ] Brand has a city
- [ ] Admin created with name, email, mobile
- [ ] Permissions ticked
- [ ] Temporary password copied and sent securely
- [ ] Admin signed in at `/city-admin/login` and set their own password
- [ ] Brand card shows **Admin configured**
