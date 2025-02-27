class BrowserFingerprint{async gather(){let e={userAgent:navigator.userAgent,language:navigator.language,colorDepth:screen.colorDepth,deviceMemory:navigator.deviceMemory||"unknown",hardwareConcurrency:navigator.hardwareConcurrency||"unknown",screenResolution:`${screen.width}x${screen.height}`,availableScreenResolution:`${screen.availWidth}x${screen.availHeight}`,timezoneOffset:new Date().getTimezoneOffset(),sessionStorage:!!window.sessionStorage,localStorage:!!window.localStorage,indexedDb:!!window.indexedDB,addBehavior:"addBehavior"in document.documentElement,openDatabase:!!window.openDatabase,cpuClass:navigator.cpuClass,platform:navigator.platform,plugins:this.getPlugins(),webgl:this.getWebGLFingerprint(),webglVendor:this.getWebGLVendor(),canvas:await this.getCanvasFingerprint(),audio:await this.getAudioFingerprint()},t=JSON.stringify(e),n=await this.sha256(t);return{raw:e,hash:n}}getPlugins(){let e=[];for(let t=0;t<navigator.plugins.length;t++){let n=navigator.plugins[t];e.push({name:n.name,description:n.description,filename:n.filename})}return e}getWebGLFingerprint(){let e=document.createElement("canvas"),t=e.getContext("webgl")||e.getContext("experimental-webgl");if(!t)return null;let n=t.getExtension("WEBGL_debug_renderer_info");return n?{vendor:t.getParameter(n.UNMASKED_VENDOR_WEBGL),renderer:t.getParameter(n.UNMASKED_RENDERER_WEBGL)}:null}getWebGLVendor(){let e=document.createElement("canvas"),t=e.getContext("webgl");if(!t)return null;let n=t.getExtension("WEBGL_debug_renderer_info");return n?t.getParameter(n.UNMASKED_VENDOR_WEBGL):null}async getCanvasFingerprint(){let e=document.createElement("canvas"),t=e.getContext("2d");if(!t)return null;e.width=240,e.height=140,t.textBaseline="alphabetic",t.fillStyle="#f60",t.fillRect(125,1,62,20),t.fillStyle="#069",t.font="11pt Arial",t.fillText("Cwm fjordbank glyphs vext quiz",2,15),t.fillStyle="rgba(102, 204, 0, 0.7)",t.font="18pt Arial",t.fillText("Fingerprint",4,45),t.globalCompositeOperation="multiply",t.fillStyle="rgb(255,0,255)",t.beginPath(),t.arc(50,50,50,0,2*Math.PI,!0),t.closePath(),t.fill(),t.fillStyle="rgb(0,255,255)",t.beginPath(),t.arc(100,50,50,0,2*Math.PI,!0),t.closePath(),t.fill(),t.fillStyle="rgb(255,255,0)",t.beginPath(),t.arc(75,100,50,0,2*Math.PI,!0),t.closePath(),t.fill(),t.fillStyle="rgb(255,0,255)",t.font="16pt Arial",t.fillText("\uD83C\uDFAF⚡️\uD83D\uDD12",30,70);let n=e.toDataURL();return await this.sha256(n)}async getAudioFingerprint(){try{let e=new(window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,44100,44100),t=e.createOscillator(),n=e.createAnalyser(),r=e.createGain();t.type="triangle",t.frequency.setValueAtTime(1e4,e.currentTime),r.gain.setValueAtTime(.5,e.currentTime),t.connect(n),n.connect(r),r.connect(e.destination),t.start(0),await e.startRendering();let a=new Float32Array(n.frequencyBinCount);return n.getFloatFrequencyData(a),await this.sha256(a.join(""))}catch(i){return null}}async sha256(e){let t=new TextEncoder().encode(e),n=await crypto.subtle.digest("SHA-256",t),r=Array.from(new Uint8Array(n));return r.map(e=>e.toString(16).padStart(2,"0")).join("")}}class ProofOfWorkSolver{constructor(){this.worker=null,this.challenge=null,this.fingerprint=null}async initialize(){let e=new BrowserFingerprint;this.fingerprint=await e.gather()}async requestChallenge(){this.fingerprint||await this.initialize();let e=await fetch("/_proxy/api/challenge/generate",{method:"GET"});return this.challenge=await e.json(),this.challenge}async solvePuzzle(){return new Promise((e,t)=>{let n=`
                        async function solveChallenge(salt, difficulty, fingerprintHash) {
                            async function sha256(message) {
                                const msgBuffer = new TextEncoder().encode(message);
                                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                                const hashArray = Array.from(new Uint8Array(hashBuffer));
                                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                            }
        
                            async function computeHash(salt, nonce, fingerprintHash) {
                                const combinedInput = salt + nonce + fingerprintHash;
                                return await sha256(combinedInput);
                            }
        
                            let nonce = 0;
                            while (true) {
                                const hash = await computeHash(salt, nonce, fingerprintHash);
                                if (hash.startsWith('0'.repeat(difficulty))) {
                                    return nonce;
                                }
                                nonce++;
                                if (nonce % 1000 === 0) {
                                    await new Promise(resolve => setTimeout(resolve, 0));
                                }
                            }
                        }
        
                        onmessage = async function(e) {
                            try {
                                const { salt, difficulty, fingerprintHash } = e.data;
                                const solution = await solveChallenge(salt, difficulty, fingerprintHash);
                                postMessage({ success: true, solution });
                            } catch (error) {
                                postMessage({ success: false, error: error.message });
                            }
                        }
                    `,r=new Blob([n],{type:"application/javascript"});this.worker=new Worker(URL.createObjectURL(r)),this.worker.onmessage=n=>{n.data.success?e(n.data.solution):t(Error(n.data.error))},this.worker.onerror=e=>{t(Error("Worker error: "+e.message))},this.worker.postMessage({salt:this.challenge.salt,difficulty:this.challenge.difficulty,fingerprintHash:this.fingerprint.hash})})}async verifySolution(e){let t=await fetch("/_proxy/api/challenge/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({challenge:this.challenge,solution:e,fingerprint:this.fingerprint.hash})});return await t.json()}stop(){this.worker&&(this.worker.terminate(),this.worker=null)}}