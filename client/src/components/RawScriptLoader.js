"use client";

import { useEffect } from "react";

export default function RawScriptLoader() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadPlugin = () => {
      const jqueryScript = document.createElement("script");
      jqueryScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js";
      jqueryScript.onload = () => {
        const script = document.createElement("script");
        script.innerHTML = `
var eppathurl = window.location.origin + window.location.pathname;
var eptagmanage = new XMLHttpRequest();
eptagmanage.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        if (this.response !== 0) {
            var temp = new Array();
            var mystr = this.response;
            temp = mystr.split("||||||||||");
            jQuery("head").find("title").remove();
            jQuery("head").append(temp[0]);
            jQuery("body").append(temp[1]);
        }
    }
};
eptagmanage.open("GET", atob("aHR0cHM6Ly9wbHVnaW5zLmF1dG9zZW9wbHVnaW4uY29tL2FsbGhlYWRkYXRhP2VrZXk9ZS1BVVRPU0VPUExVR0lOOTQwOTY3MDI1NiZla2V5cGFzcz1pbFBIUlRWOXJhMzFKQkNOcXdUbGRBblNMd2s3RDE4b3JUVEImc2l0ZXVybD0=") + eppathurl);
eptagmanage.send();
        `;
        document.body.appendChild(script);
      };
      document.body.appendChild(jqueryScript);
    };

    // Delay until React has finished hydration and settled its DOM
    if ("requestIdleCallback" in window) {
      requestIdleCallback(loadPlugin);
    } else {
      setTimeout(loadPlugin, 500);
    }

  }, []);

  return null;
}