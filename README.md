# UNMADE

**Try it before it exists.**

UNMADE is a fashion demand-validation platform that allows independent designers to test clothing concepts before manufacturing them.

Powered by **Perfect Corp's YouCam AI Clothes API**, customers can virtually try on proposed garments, explore different designs, and reserve their favorites.

Designers use this customer interest to make more informed production decisions.

## The Problem

Launching a new fashion collection is expensive and risky, especially for independent designers and small fashion brands.

Designers often invest in samples, manufacturing, and inventory **before knowing whether customers actually want their designs**.

This creates several challenges:

- **Financial risk:** Designers spend money manufacturing products without knowing whether they will sell.
- **Unsold inventory:** Unpopular designs can become excess stock.
- **Material waste:** Overproduction wastes fabric, materials, and other resources.
- **Unreliable feedback:** Social media likes, comments, and polls don't necessarily indicate purchase intent.
- **Limited customer visualization:** Customers may struggle to imagine themselves wearing a garment based only on a sketch or product image.

Traditional fashion follows this process:

**Design → Manufacture → Sell → Discover Demand**

But what if designers could understand customer interest before committing to production?

## Our Solution

UNMADE reverses the traditional fashion production process.

**Design → Virtual Try-On → Customer Reservations → Demand Validation → Production Decision**

Instead of manufacturing every concept and hoping customers will buy it, designers can introduce proposed designs directly to their audience.

Customers can experience those designs through virtual try-on and express purchase interest.

Designers then use that information to identify which concepts are worth moving toward production.

## How UNMADE Works

UNMADE has two separate experiences: the **Designer Studio** and the **Public Showroom**.

### 1. Designer Studio

The Designer Studio is a private workspace where fashion designers manage their collections.

Designers can:

- Create clothing drops containing multiple proposed designs.
- Upload garment reference images.
- Set proposed prices and available sizes.
- Define minimum reservation targets.
- Publish collections and generate shareable links.
- Monitor customer engagement and reservation progress.
- Evaluate which designs attract the most interest.

The dashboard provides insights into customer visits, virtual try-ons, reservations, and progress toward production targets.

This helps designers make more informed decisions before investing in manufacturing.

### 2. Public Showroom

Every published drop has a public showroom accessible through a shareable link.

Customers don't need to create an account to explore or virtually try on designs.

**Explore Designs**

Customers browse proposed garments, view prices, and see progress toward each design's reservation target.

**Virtual Try-On**

Using the **YouCam AI Clothes API**, customers upload their photographs and visualize themselves wearing garments that haven't been manufactured yet.

They can experiment with multiple designs and compare the results.

**Reserve a Favorite**

After finding a preferred design, customers can select their size and submit a reservation.

Reservations express purchase interest at the proposed price. No payment is collected during the MVP.

**See the Impact**

Each confirmed reservation contributes to the design's demand target, giving designers a clearer indication of customer interest.

### 3. Demand Validation

UNMADE connects customer engagement with designer decision-making.

For example, a designer publishes three jacket concepts:

| Design | Reservations | Target |
|---|---:|---:|
| Midnight Jacket | 65 | 50 |
| Heritage Hoodie | 28 | 75 |
| Urban Overshirt | 48 | 40 |

The designer can immediately identify which concepts have reached their reservation targets.

Rather than manufacturing all three designs, they can prioritize those with stronger demonstrated interest.

Reaching a target does not automatically trigger manufacturing. The designer makes the final production decision.

## Why YouCam?

Virtual try-on is central to the UNMADE experience.

Traditional demand validation relies on sketches, mockups, product photographs, or customer surveys.

With **Perfect Corp's YouCam AI Clothes API**, customers can visualize proposed garments on themselves before those garments exist as physical inventory.

This makes early-stage fashion concepts more tangible and helps customers make more informed choices.

UNMADE combines this visual experience with reservations and demand tracking, connecting virtual try-on directly to decisions about what gets manufactured.

*Virtual try-on results are visual simulations and do not guarantee physical fit, exact materials, or manufacturing feasibility.*

## Running Locally

### Prerequisites

- Node.js and npm
- Perfect Corp YouCam API credentials
- Any additional credentials required for email delivery or image storage

### Installation

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment variables**

Create a `.env.local` file in the project root.

Configure your YouCam API credentials and any other required environment variables. Refer to `.env.example` if the repository provides one.

Keep API credentials private and server-side.

**3. Initialize the database**

If using SQLite with Drizzle ORM:

```bash
npx drizzle-kit push
```

**4. Start the development server**

```bash
npm run dev
```

**5. Open the application**

Visit:

```text
http://localhost:3000
```

Sign in to the Designer Studio to create a drop, then use its public link to experience the customer workflow.

### Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend and backend |
| SQLite | Database |
| Perfect Corp YouCam AI Clothes API | Virtual clothing try-on |

## The Vision

UNMADE explores a different approach to fashion production.

Instead of manufacturing products first and discovering demand afterward, designers can invite customers into the decision-making process before production begins.

This approach could help independent brands make better-informed decisions, reduce unnecessary inventory, and build collections around customer interest.

**UNMADE — Try it before it exists.**