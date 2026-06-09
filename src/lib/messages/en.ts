export const messages = {
  // Language selector
  languageSelectorLabel: "Language",

  // Cart drawer
  basketLabel: "Basket",
  basketTitle: "Basket ({{count}})",
  closeBasket: "Close basket",
  basketEmpty: "Your basket is empty.",
  subtotal: "Subtotal",
  continueToCheckout: "Continue to checkout →",
  clearBasket: "Clear basket",
  cartVatNotice: "All prices ex-VAT. VAT applied on invoice based on your country and VAT registration. Hardware invoiced 100% prior to shipment.",

  // Product filter chips
  filterMildSteel: "Mild Steel",
  filterStainlessSteel: "Stainless Steel",

  // Stock status labels
  stockInStock: "In Stock",
  stockLimitedStock: "Limited Stock",
  stockOnOrder: "On Order",

  // Product grid sections
  sectionControlPanels: "Control Panels",
  sectionSensors: "Sensors, Software & Accessories",
  sectionVisualFactory: "Visual Factory",
  filterAll: "All",
  noMatchingPanels: "No panels match those filters.",
  prevPhoto: "Previous photo",
  nextPhoto: "Next photo",
  decreaseQty: "Decrease quantity",
  increaseQty: "Increase quantity",

  // Checkout form sections
  sectionYourDetails: "Your details",
  sectionDeliveryAddress: "Delivery / site address",
  sectionProjectDetails: "Project details",
  sectionOrderSummary: "Order summary",

  // Checkout form fields
  fieldFirstName: "First name",
  fieldLastName: "Last name",
  fieldCompany: "Company",
  fieldSiteName: "Site name",
  fieldSiteNamePlaceholder: "e.g. Manchester Factory, Unit 4 Warehouse",
  fieldEmail: "Email",
  fieldPhone: "Phone",
  fieldAddressLine1: "Address line 1",
  fieldAddressLine2: "Address line 2",
  fieldTownCity: "Town / City",
  fieldPostcode: "Postcode",
  fieldCountry: "Destination country",
  fieldRequiredDate: "Required delivery date",
  fieldProjectDescription: "Project description",
  fieldProjectDescriptionPlaceholder: "Site details, special requirements, anything else we should know…",
  fieldInstallRequest: "Request an installation quote alongside this order.",
  fieldInstallRequestDesc: "Covers installation of all control panels, sensors, sensor cabling and commissioning, plus project management of Visual Factory items. Does not include physical installation of Visual Factory hardware itself.",

  // Checkout order summary
  productsSubtotal: "Products subtotal",
  shipping: "Shipping",
  pallet: "pallet",
  pallets: "pallets",
  shippingEXW: "EXW — you arrange",
  shippingEXWOption: " — EXW (you arrange shipping)",
  estimatedTotal: "Estimated total",
  vatAllPricesExVat: "All prices ex-VAT.",
  vatAppliedBasedOn: "VAT is applied on the invoice based on your country and VAT registration status:",
  vatBulletUK: "UK customers — 20% VAT",
  vatBulletEU: "EU VAT-registered businesses — zero-rated under reverse charge (VAT number required)",
  vatBulletNonEU: "Non-EU customers — zero-rated export",
  shippingEstimateNote: "Shipping is estimated and confirmed on invoice. Hardware invoiced 100% prior to shipment. DAP delivery terms.",

  // Checkout actions and errors
  backToBasket: "← Back to basket",
  submitQuote: "Submit quote request",
  submittingLabel: "Submitting…",
  amendingNotice: "Amending {{ref}} — your details are pre-filled. Adjust your basket and submit to create a revised quote. The original will be marked as superseded.",
  errNameEmail: "First name, last name and email are required.",
  errCompany: "Company name is required.",
  errPhone: "Phone number is required.",
  errSiteName: "Site name is required.",
  errProjectDesc: "Project description is required.",
  errDate: "Required delivery date is required.",
  errBasketEmpty: "Basket is empty.",

  // Quote confirmation page
  confirmationBadge: "Quote submitted",
  confirmationThanks: "Thanks {{name}} — we've received your request. A confirmation email with your magic link has been sent to {{email}}. Use that link to amend or accept your quote once it's been priced.",
  companyLabel: "Company:",
  siteLabel: "Site:",
  itemsLabel: "Items",
  subtotalLabel: "Subtotal",
  shippingLabel: "Shipping",
  totalExVAT: "Total (ex-VAT)",
  vatShortNotice: "All prices ex-VAT. VAT is applied on the invoice based on your country and VAT registration status — UK customers pay 20%, EU VAT-registered businesses are zero-rated under reverse charge (VAT number required), non-EU customers are zero-rated as export.",
  hardwareInvoiceNote: "Hardware invoiced 100% prior to shipment. DAP delivery terms.",
  backToCatalogue: "Back to the catalogue",
  quoteNotFound: "Quote not found",
  quoteNotFoundDesc: "We couldn't find a quote with reference {{ref}}.",

  // Quote edit page statuses
  yourQuoteBadge: "Your quote",
  statusQuoteSubmitted: "Quote submitted — under review",
  statusOrderConfirmed: "Order confirmed",
  statusInBuild: "In build / production",
  statusReadyToShip: "Ready to ship",
  statusShipped: "Shipped",
  statusComplete: "Complete",
  statusCancelled: "Cancelled",

  // Quote edit page content
  editGreeting: "Hi {{name}} — here is your current quote. The AJS Redzone team will be in touch to confirm final pricing and lead times. Use the buttons below to amend or accept.",
  yourDetailsHeading: "Your details",
  nameLabel: "Name:",
  emailLabel: "Email:",
  requiredByLabel: "Required by:",
  vatShortNoticeEdit: "All prices ex-VAT. VAT applied on invoice based on registration status. Hardware invoiced 100% prior to shipment. DAP delivery terms.",
  amendQuote: "Amend quote",
  acceptOrder: "Accept & Place Order",
  orderPlacedNote: "This order has been placed. Contact {{email}} if you have any questions.",
  orderConfirmedBanner: "Order confirmed. Your order has been placed. An invoice will be issued within 24 hours, payable prior to shipment. You'll receive email updates as your order progresses.",
  backToCatalogueLink: "← Back to the catalogue",

  // Invalid / expired links
  invalidLinkTitle: "Invalid link",
  invalidLinkDesc: "This quote link is invalid. Please check the email you received from AJS Redzone.",
  linkExpiredTitle: "Link expired",
  linkExpiredDesc: "Your magic link for {{ref}} has expired after 90 days.",
  linkExpiredDescGeneric: "Your magic link has expired after 90 days.",
  contactForNewLink: "Contact us for a new link:",
  needHelp: "Need help?",

  // Email verification
  returningToQuote: "Returning to your quote",
  verifyEmailPrompt: "To view your quote, please confirm the email address you used when submitting it.",
  fieldEmailAddress: "Email address",
  fieldEmailPlaceholder: "The email you used when requesting this quote",
  confirmEmailBtn: "Confirm email",

  // Accept page
  acceptAndPlaceTitle: "Accept & place order",
  bindingOrderNote: "You are about to place a binding order for the items below. Please complete the account information form so we can invoice you correctly.",
  sessionExpiredTitle: "Session expired",
  sessionExpiredDesc: "Please return via your magic link to verify your email again.",
  backToQuoteBtn: "Back to your quote",
  orderAlreadyPlacedTitle: "Order already placed",
  orderAlreadyPlacedDesc: "This quote has already been accepted.",
  viewOrderBtn: "View your order",
  backToQuoteLink: "← Back to quote",

  // Amend page
  invalidAmendLinkDesc: "Please return via the link in your original quote email.",
  orderAlreadyPlacedAmendDesc: "This quote has been accepted and can no longer be amended. Contact {{email}} if you need to make changes.",

  // Support banner
  supportTitle: "Need help with your quote?",
  supportDesc: "Lost your link, need to make changes, or have a question — we're here.",
  emailUs: "Email us →",
};
