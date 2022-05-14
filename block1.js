(async function run() {
  try {
    const { initialReduxState } = JSON.parse(
      document.querySelector("script#__NEXT_DATA__").innerHTML
    ).props;

    const LOCAL_STORAGE_KEY = "crippo_repliedAdIds";
    const LIMIT = 99;

    if (localStorage.getItem(LOCAL_STORAGE_KEY) === null) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
    }

    const { bearerToken } = initialReduxState.authentication;

    if (!initialReduxState.account.user.loggedIn) {
      alert("Du måste logga in först crippo 😉");
      return;
    }

    const sleep = async (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const asyncQuerySelector = async (selectorCallback, timeout = 20000) => {
      let element = selectorCallback();

      await new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const interval = setInterval(() => {
          if (!element) {
            element = selectorCallback();

            if (Date.now() - timestamp > timeout) {
              clearInterval(interval);
              reject("Kunde inte hitta elementet...");
            }
          } else {
            resolve();
            clearInterval(interval);
          }
        }, 100);
      });

      return element;
    };

    const typeTextToInput = async (
      inputElement,
      text,
      duration = 2000,
      extraAttempts = 3
    ) => {
      for (let index = 0; index < text.length; index++) {
        inputElement.value += text.charAt(index);

        await sleep(duration / text.length);
      }

      if (inputElement.value !== text) {
        if (extraAttempts > 0) {
          inputElement.value = "";
          await typeTextToInput(
            inputElement,
            text,
            duration,
            extraAttempts - 1
          );
        } else {
          throw new Error("Meddelandet skrevs inte korrekt!");
        }
      }

      await sleep(100);
    };

    const defaultSearchUrl =
      "https://www.blocket.se/annonser/hela_sverige/fordon/bilar?cg=1020&f=p&pl=0";
    const searchUrl =
      prompt("Klistra in urlen för blocket sökningen:", defaultSearchUrl) ||
      defaultSearchUrl;

    if (document.querySelector("#crippo_popup")) {
      document.querySelector("#crippo_popup").remove();
    }
    document.querySelector("body").style = "background: #000";
    document.querySelector("#__next").style =
      "opacity: 0.3; filter: blur(4px);";

    const popupElement = document.createElement("div");
    popupElement.id = "crippo_popup";
    popupElement.style = `
        box-sizing: border-box; 
        width: calc(100% - 100px); 
        height: calc(100% - 100px); 
        background: #fff; 
        position: fixed; 
        top: 0; 
        left: 0; 
        padding: 20px;
        margin: 50px;
    `;
    document.body.appendChild(popupElement);

    const popupInnerElement = document.createElement("div");
    popupInnerElement.style = `
        position: relative;
        width: 100%;
        height: 100%;
    `;
    popupElement.appendChild(popupInnerElement);

    const iframeElement = document.createElement("iframe");
    iframeElement.tabIndex = -1;
    iframeElement.style = `
        box-sizing: border-box;
        display: inline-block; 
        position: absolute; 
        width: 50%; 
        height: 100%;
        opacity: 0;
        transition: opacity 3s;
        border: 5px solid #000; 
        pointer-events: none;
    `;

    iframeElement.src = "https://www.blocket.se/";

    popupInnerElement.appendChild(iframeElement);

    const consoleElement = document.createElement("textarea");
    consoleElement.readOnly = true;
    consoleElement.style = `
        font-family: 'Courier New', monospace; 
        font-size: 16px; 
        box-sizing: border-box; 
        background: #000;
        position: absolute;
        right: 0;
        transition: width 2s;
        overflow-y: scroll; 
        display: inline-block; 
        width: 100%;
        height: 100%; 
        color: #fff; 
        padding: 3%;
        resize: none;
    `;

    popupInnerElement.appendChild(consoleElement);

    const writeToConsole = async (text) => {
      for (let index = 0; index < text.length; index++) {
        consoleElement.value += text.charAt(index);
        consoleElement.scrollTop = consoleElement.scrollHeight;
        await sleep(500 / text.length);
      }
    };

    await writeToConsole(
      `888      888                   888       d888   
888      888                   888      d8888   
888      888                   888        888   
88888b.  888  .d88b.   .d8888b 888  888   888   
888 "88b 888 d88""88b d88P"    888 .88P   888   
888  888 888 888  888 888      888888K    888   
888 d88P 888 Y88..88P Y88b.    888 "88b   888   
88888P"  888  "Y88P"   "Y8888P 888  888 8888888 
                                                                 
888                .d8888b.  888                
888               d88P  Y88b 888                
888               888    888 888                
88888b.   8888b.  888        888  888           
888 "88b     "88b 888        888 .88P           
888  888 .d888888 888    888 888888K            
888  888 888  888 Y88b  d88P 888 "88b           
888  888 "Y888888  "Y8888P"  888  888                                                                                                                                                                                                                    

=====================================

👋 Hej crippo, nu kör vi...`
    );

    await sleep(1000);

    consoleElement.style.width = "calc(50% - 20px)";

    iframeElement.style.opacity = 1;

    await writeToConsole(`\n\n⏳ Hämtar de ${LIMIT} senaste annonserna...`);
    const ads = await fetch(
      `https://api.blocket.se/search_bff/v1/content${
        new URL(searchUrl).search
      }&lim=${LIMIT}&st=s&include=all&gl=3&include=extend_with_shipping`,
      {
        headers: {
          authorization: `Bearer ${bearerToken}`
        },

        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include"
      }
    )
      .then((r) => r.json())
      .then((r) => r.data);

    await writeToConsole("\n\n=====================================\n\n");

    for (let index = 0; index < ads.length; index++) {
      const ad = ads[index];
      if (iframeElement.contentDocument === null) {
        break;
      }
      try {
        const adUrl = ad.share_url;

        await writeToConsole(
          `⏳ Laddar annons ${index + 1}/${ads.length}: ${adUrl}`
        );

        if (
          !JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)).includes(
            ad.ad_id
          )
        ) {
          iframeElement.src = adUrl;

          const messageButtonElement = await asyncQuerySelector(() =>
            iframeElement.contentDocument.querySelector(
              "[data-cy='send-message-button']"
            )
          );

          await writeToConsole("\n\n🖱️ Klickar på skicka meddelande knappen");
          messageButtonElement.click();

          await sleep(1000);

          await writeToConsole("\n\n⏳ Laddar...");

          if (index === 0) {
            await sleep(1000);
            await writeToConsole(
              "\n\n🙃 Annars då? Gjort mycket beats på senaste?"
            );
            await sleep(1000);
          }

          const messageInputElement = await asyncQuerySelector(() =>
            iframeElement.contentDocument.querySelector(
              "[data-cy='message-input']"
            )
          );

          await sleep(1000);

          await writeToConsole("\n\n📝 Skriver meddelande...");

          const msg = `${
            ad.price.value * 0.5
          }Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.`;

          await typeTextToInput(messageInputElement, msg);

          await writeToConsole("\n\n⏳ Skickar meddelande...");

          await sleep(3000);

          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify([
              ...JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)),
              ad.ad_id
            ])
          );

          await writeToConsole("\n\n😁 Klart! Dags att dra till nästa annons");
        } else {
          await writeToConsole(
            "\n\n😏 Okej! Vi verkar redan ha svarat på den här annonsen, så vi drar till nästa!"
          );
        }

        await writeToConsole("\n\n=====================================\n\n");

        await sleep(1000);
      } catch (e) {
        await writeToConsole(
          `\n\n😱 Någonting gick åt helvete, provar nästa annons. Felmeddelande: ${e}`
        );
        await writeToConsole("\n\n=====================================\n\n");
      }
    }

    if (iframeElement.contentDocument !== null) {
      alert(
        "Klart! Ladda om sidan och kör scriptet igen för svara på nya annonser!"
      );
    }
  } catch (e) {
    console.error("Failed: ", e);
  }
})();
