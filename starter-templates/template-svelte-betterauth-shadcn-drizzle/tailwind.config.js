import { fontFamily } from "tailwindcss/defaultTheme";

const config = {
	darkMode: ["class"],
	content: ["./src/**/*.{html,js,svelte,ts}"],
	safelist: ["dark"],
	theme: {
		
		extend: {
			
			fontFamily: {
				sans: [...fontFamily.sans]
			}
		}
	},
	corePlugins: {
		preflight: true,
	  }
};

export default config;
