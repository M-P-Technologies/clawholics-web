// One Clerk theme for the sign in and sign up screens, built from the same
// tokens as the rest of the site.
export const clerkAppearance = {
  layout: { logoPlacement: "none" as const },
  elements: {
    cardBox: "!shadow-xl !shadow-crimson/10 !bg-light-orange !border !border-crimson-light !rounded-sm",
    card: "!bg-transparent !shadow-none w-full max-w-[400px] gap-8",

    headerTitle:
      "!font-display !text-2xl !font-normal !uppercase !tracking-widest !text-gray-red mb-1 text-center",
    headerSubtitle: "!font-sans !text-sm !text-gray-red/80 text-center",

    socialButtonsBlockButton:
      "!w-full !bg-light-orange hover:!bg-light-orange/70 !text-gray-red !rounded-md py-4 !shadow-none !border !border-crimson-light font-sans !text-base transition-colors !justify-center",
    socialButtonsBlockButtonText: "!font-sans !justify-center",

    dividerLine: "!bg-crimson-light",
    dividerText: "!text-gray-red/70 !font-sans lowercase",

    formFieldLabel:
      "!font-sans !text-sm !font-bold !uppercase !tracking-widest !text-gray-red mb-1.5",
    formFieldInput:
      "!w-full !bg-light-orange/70 !text-gray-red !rounded-md px-4 py-4 !border !border-crimson-light focus:!border-crimson focus:!ring-2 focus:!ring-crimson/30 !shadow-none font-sans text-base",

    formButtonPrimary:
      "!w-full !bg-crimson hover:!bg-gray-red !text-light-orange !text-sm py-4 !rounded-md !font-bold !shadow-md !shadow-crimson/30 transition-colors mt-4 uppercase !tracking-extrawide",

    footer: "!bg-transparent !border-0 !shadow-none !p-0",
    footerAction: "!bg-transparent !w-full !flex !justify-center",
    footerActionText: "!text-gray-red/80 !font-sans text-sm",
    footerActionLink: "!text-crimson !font-bold hover:!text-gray-red !font-sans text-sm",
    formFieldAction: "!text-crimson !font-sans text-sm hover:underline",
  },
};

// The account menu that opens from the avatar in the top bar
export const userButtonAppearance = {
  elements: {
    userButtonPopoverCard:
      "!bg-light-orange !border !border-crimson-light !rounded-sm !shadow-xl !shadow-crimson/20",
    userPreviewMainIdentifier: "!font-sans !font-bold !text-gray-red",
    userPreviewSecondaryIdentifier: "!font-sans !text-gray-red/70",
    userButtonPopoverActionButton: "hover:!bg-crimson-light/30",
    userButtonPopoverActionButtonText: "!font-sans !text-gray-red",
    userButtonPopoverActionButtonIcon: "!text-crimson",
    userButtonPopoverFooter: "!hidden",
  },
};

// The sign in and sign up screens' titles and button text
export const clerkLocalization = {
  signIn: {
    start: {
      title: "Sign in to Clawholics",
      subtitle: "Welcome back! Please sign in to continue.",
      actionButton: "CONTINUE",
    },
  },
  signUp: {
    start: {
      title: "Create your account",
      subtitle: "Please fill in the details to get started.",
      actionButton: "CONTINUE",
    },
  },
};
