(async function app() {
  const LOCAL_STORAGE_KEY = "crippo_store";
  const MSG_PLACEHOLDER_PRICE = "{{{PRIS}}}";
  const LIMIT = 99;

  const setState = (stateOrCallback) => {
    const state =
      typeof stateOrCallback === "function"
        ? stateOrCallback(getState())
        : stateOrCallback;

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  };

  const getState = () => {
    const state = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (state === null) {
      const initialState = {
        repliedAds: [],
        settings: {
          msgPrivate: `Hej mitt namn är Jan Mankell och jag undrar om bilen finns kvar? Ser ut att vara en supertrevlig bil och ungefär en sådan jag kikar efter. Dock så är min inköpsbudget något begränsad. Normalt sett så skulle jag titta på bilen innan jag diskuterar priset men jag har några mil att åka så jag undrar därför om ni kan tänka er en nivå neråt {{{PRIS}}}kr? Sådana fall talar vi om en snabb & krångelfri affär på momangen utan någon vidare tjat eller "sista pris" diskussioner 🙂 Jag lägger gärna en handpenning där jag kan visa att jag är seriös och med det låsa affären tills jag dyker upp (som nämnt ovan är vi en bit ifrån varandra). Ta gärna en funderare och återkom. Tack på förhand mvh Jan L`,
          testMode: false,
          bargainRanges: [
            { min: 10000, max: 49999, bargain: 0.3 },
            { min: 50000, max: 99999, bargain: 0.2 },
            { min: 100000, max: 499999, bargain: 0.1 },
          ],
          waitingTimeUntilNextAd: 3000,
          maxRepliesWithinTime: {
            maxReplies: 25,
            withinTime: 60 * 60 * 24 * 1000,
          },
          searchUrl:
            "https://www.blocket.se/annonser/hela_sverige/fordon/bilar?cg=1020&f=p&pl=0",
        },
      };

      setState(initialState);

      return initialState;
    }

    return JSON.parse(state);
  };

  const getSession = () => {
    const { initialReduxState } = JSON.parse(
      document.querySelector("script#__NEXT_DATA__").innerHTML
    ).props;

    const { bearerToken } = initialReduxState.authentication;

    return {
      bearerToken,
      user: {
        loggedIn: initialReduxState.account.user.loggedIn,
        id: initialReduxState.account.user.id,
      },
    };
  };

  const calculateBargainPrice = (price) =>
    price -
    (price *
      getState()
        .settings.bargainRanges.map((range) =>
          price >= range.min && price <= range.max ? range.bargain : undefined
        )
        .filter(Boolean)[0] || 1);

  const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        await typeTextToInput(inputElement, text, duration, extraAttempts - 1);
      } else {
        throw new Error("Meddelandet skrevs inte korrekt!");
      }
    }

    await sleep(100);
  };

  const renderUI = () => {
    const templateHtml = `
        <div>
          <style>
            #crippo_popup {
              box-sizing: border-box; 
              width: calc(100% - 100px); 
              height: calc(100% - 100px); 
              background: #fff; 
              position: fixed; 
              top: 0; 
              left: 0; 
              padding: 20px;
              margin: 50px;
            }
            #crippo_popup_inner {
              position: relative;
              width: 100%;
              height: calc(100% - 23px);
            }
            #crippo_popup_footer {
              margin-top: 5px;
              font-size: 14px;
              line-height: 17px;
            }
            #crippo_popup_iframe {
              box-sizing: border-box;
              display: inline-block; 
              position: absolute; 
              width: 50%; 
              height: 100%;
              opacity: 0;
              transition: opacity 3s;
              border: 5px solid #000; 
              pointer-events: none;
            }
            #crippo_popup_console {
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
            }
          </style>

          <div id="crippo_popup">
            <div id="crippo_popup_inner">
              <iframe id="crippo_popup_iframe" tabindex="-1" src="https://www.blocket.se"></iframe>
              <textarea id="crippo_popup_console" readonly></textarea>
            </div>
            <div id="crippo_popup_footer">
              Version 1.0.0 | <a href="javascript:location.reload()">Stoppa</a>
            </div>
          </div>
        </div>
      `;

    if (document.querySelector("#crippo_popup")) {
      document.querySelector("#crippo_popup").remove();
    }
    document.querySelector("body").style = "background: #000";
    document.querySelector("#__next").style =
      "opacity: 0.3; filter: blur(4px);";

    const uiElement = document.createElement("div");
    uiElement.innerHTML = templateHtml;
    document.body.appendChild(uiElement);

    const iframeElement = document.querySelector("#crippo_popup_iframe");
    const consoleElement = document.querySelector("#crippo_popup_console");

    const writeToConsole = async (text) => {
      for (let index = 0; index < text.length; index++) {
        consoleElement.value += text.charAt(index);
        consoleElement.scrollTop = consoleElement.scrollHeight;
        await sleep(500 / text.length);
      }
    };

    return { iframeElement, consoleElement, writeToConsole };
  };

  try {
    const UI = renderUI();

    const runIntro = async () => {
      if (!getSession().user.loggedIn) {
        alert("Du måste logga in först crippo 😉");
        return;
      }
      /*
      await UI.writeToConsole(
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
*/
      UI.consoleElement.style.width = "calc(50% - 20px)";
      UI.iframeElement.style.opacity = 1;
    };

    const run = async () => {
      await UI.writeToConsole(
        `\n\n⏳ Hämtar de ${LIMIT} senaste annonserna...`
      );

      const ads = await fetch(
        `https://api.blocket.se/search_bff/v1/content${
          new URL(getState().settings.searchUrl).search
        }&lim=${LIMIT}&st=s&include=all&gl=3&include=extend_with_shipping`,
        {
          headers: {
            authorization: `Bearer ${getSession().bearerToken}`,
          },
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        }
      )
        .then((r) => r.json())
        .then((r) => r.data);

      await UI.writeToConsole("\n\n=====================================\n\n");

      for (let index = 0; index < ads.length; index++) {
        const ad = ads[index];
        if (UI.iframeElement.contentDocument === null) {
          break;
        }

        try {
          const adUrl = ad.share_url;

          await UI.writeToConsole(
            `⏳ Laddar annons ${index + 1}/${ads.length}: ${adUrl}`
          );

          const alreadyRepliedAd = getState().repliedAds.find(
            (repliedAd) => repliedAd.id === ad.ad_id
          );

          if (!alreadyRepliedAd) {
            UI.iframeElement.src = adUrl;

            const messageButtonElement = await asyncQuerySelector(() =>
              UI.iframeElement.contentDocument.querySelector(
                "[data-cy='send-message-button']"
              )
            );

            await UI.writeToConsole(
              "\n\n🖱️ Klickar på skicka meddelande knappen"
            );
            messageButtonElement.click();

            await sleep(1000);

            await UI.writeToConsole("\n\n⏳ Laddar...");

            if (index === 0) {
              await sleep(1000);
              await UI.writeToConsole(
                "\n\n🙃 Annars då? Gjort mycket beats på senaste?"
              );
              await sleep(1000);
            }

            const messageInputElement = await asyncQuerySelector(() =>
              UI.iframeElement.contentDocument.querySelector(
                "[data-cy='message-input']"
              )
            );

            await sleep(1000);

            await UI.writeToConsole("\n\n📝 Skriver meddelande...");

            const msg = getState().settings.msgPrivate.replace(
              MSG_PLACEHOLDER_PRICE,
              calculateBargainPrice(ad.price.value)
            );

            await typeTextToInput(messageInputElement, msg);

            await UI.writeToConsole("\n\n⏳ Skickar meddelande...");

            await sleep(3000);

            setState((state) => ({
              ...state,
              repliedAds: [
                ...state.repliedAds,
                {
                  id: ad.ad_id,
                  timestamp: Date.now(),
                  userId: getSession().user.id,
                },
              ],
            }));

            await UI.writeToConsole(
              "\n\n😁 Klart! Dags att dra till nästa annons. Men vi väntar lite, typ " +
                getState().settings.waitingTimeUntilNextAd / 1000 +
                " sekunder, så Blocket inte blir stressad och skiter på sig..."
            );

            await sleep(getState().settings.waitingTimeUntilNextAd);
          } else {
            await UI.writeToConsole(
              "\n\n😏 Okej! Vi verkar redan ha svarat på den här annonsen, så vi drar till nästa!"
            );
          }

          await UI.writeToConsole(
            "\n\n=====================================\n\n"
          );

          await sleep(1000);
        } catch (e) {
          await UI.writeToConsole(
            `\n\n😱 Någonting gick åt helvete, provar nästa annons. Felmeddelande: ${e}`
          );
          await UI.writeToConsole(
            "\n\n=====================================\n\n"
          );
        }
      }

      if (UI.iframeElement.contentDocument !== null) {
        alert(
          "Klart! Ladda om sidan och kör scriptet igen för svara på nya annonser!"
        );
      }
    };

    await runIntro();
    await run();
  } catch (e) {
    console.error("Failed: ", e);
  }
})();
