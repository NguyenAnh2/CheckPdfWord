import { useRef, useState, useEffect } from "react";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import "./App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

const MAX_VOICE_WORDS = 500;
const MAX_PDF_WORDS = 5000;

function App() {
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const recognitionRef = useRef<any>(null);

  const [text, setText] = useState("");

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Add a ref to track if we should be listening
  const shouldBeListeningRef = useRef(false);
  
  const startListening = () => {
    setErrorMessage("");
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Trình duyệt không hỗ trợ Speech Recognition.");
      return;
    }

    // Set our ref to indicate we should be listening
    shouldBeListeningRef.current = true;
    setIsListening(true);
    setVoiceText("");
    
    const setupAndStartRecognition = () => {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
  
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = "vi-VN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = true; // Cho phép ghi âm liên tục
  
        recognition.onstart = () => {
          setIsListening(true);
          console.log("Recognition started");
        };
  
        recognition.onresult = (event: any) => {
          let result = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              result += event.results[i][0].transcript + " ";
            }
          }
  
          const words = result.trim().split(/\s+/);
          if (words.length > MAX_VOICE_WORDS) {
            result = words.slice(0, MAX_VOICE_WORDS).join(" ");
          }
  
          setVoiceText((prev) => {
            const combined = (prev + " " + result).trim();
            const finalWords = combined.split(/\s+/);
            return finalWords.length > MAX_VOICE_WORDS
              ? finalWords.slice(0, MAX_VOICE_WORDS).join(" ")
              : combined;
          });
        };
  
        recognition.onerror = (event: any) => {
          console.log(`Recognition error: ${event.error}`);
          
          // For no-speech errors, continue listening without showing error
          if (event.error === 'no-speech') {
            // Do nothing, this is expected during silence
          } else {
            setErrorMessage(`Lỗi: ${event.error}`);
          }
          
          // Don't stop listening on errors, we'll restart in onend
        };
  
        // Critical part: always restart if we should be listening
        recognition.onend = () => {
          console.log("Recognition ended, checking if should restart");
          
          // Only restart if user hasn't clicked stop
          if (shouldBeListeningRef.current) {
            console.log("Restarting recognition...");
            // Small delay before restarting to prevent rapid cycling
            setTimeout(() => {
              if (shouldBeListeningRef.current) {
                try {
                  recognition.start();
                  console.log("Recognition restarted successfully");
                } catch (error) {
                  console.error("Failed to restart recognition", error);
                  
                  // If we can't restart, try one more time after a longer delay
                  setTimeout(() => {
                    if (shouldBeListeningRef.current) {
                      try {
                        setupAndStartRecognition();
                      } catch (finalError) {
                        shouldBeListeningRef.current = false;
                        setIsListening(false);
                        setErrorMessage("Không thể tiếp tục ghi âm sau nhiều lần thử. Vui lòng thử lại.");
                      }
                    }
                  }, 1000);
                }
              }
            }, 300);
          } else {
            setIsListening(false);
          }
        };
  
        recognition.start();
      } catch (error) {
        console.error("Setup recognition error:", error);
        setErrorMessage("Lỗi khởi tạo nhận dạng.");
        shouldBeListeningRef.current = false;
        setIsListening(false);
      }
    };
    
    // Start the recognition process
    setupAndStartRecognition();
  };

  const stopListening = () => {
    // Set our ref to indicate we should stop listening
    shouldBeListeningRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
    setIsListening(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setText("");

    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const typedarray = new Uint8Array(reader.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item: any) => item.str)
              .join(" ");
            fullText += pageText + " ";
          }

          const words = fullText.split(/\s+/);
          if (words.length > MAX_PDF_WORDS) {
            fullText =
              words.slice(0, MAX_PDF_WORDS).join(" ") + "\n...(đã rút gọn)";
          }

          setText(fullText);
        } catch {
          setText("Lỗi xử lý file PDF.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          const words = result.value.split(/\s+/);
          let docText = result.value;
          if (words.length > MAX_PDF_WORDS) {
            docText =
              words.slice(0, MAX_PDF_WORDS).join(" ") + "\n...(đã rút gọn)";
          }
          setText(docText);
        } catch {
          setText("Không thể đọc file Word.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setText("Chỉ hỗ trợ file PDF hoặc Word (.docx).");
    }
  };

  function highlightMatchedWords(pdfText: string, voiceText: string) {
    if (!voiceText.trim()) return pdfText;

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,!?;:…]/g, "");

    const voiceWords = voiceText.split(/\s+/).map(normalize).filter(Boolean);
    const voiceSet = new Set(voiceWords);

    const wordsWithSpaces = pdfText.split(/(\s+)/);

    return wordsWithSpaces.map((word, index) => {
      const cleanedWord = normalize(word.trim());
      if (!word.trim()) return word;

      if (voiceSet.has(cleanedWord)) {
        return (
          <span key={index} className="highlight">
            {word}
          </span>
        );
      }

      return word;
    });
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">🗂️ Đọc PDF/Word & Nhận diện giọng nói</h1>

        <div className="file-section">
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>

        <div className="file-description">
          <h5 style={{ display: "flex", justifyContent: "center" }}>
            Chọn file PDF hoặc Word để hiển thị và so sánh nội dung giọng nói.
          </h5>
        </div>

        <div className="voice-section">
          <div className="btn-group">
            <button
              onClick={startListening}
              disabled={isListening}
              className="btn-mic"
            >
              🎤
            </button>
            <button
              onClick={stopListening}
              disabled={!isListening}
              className="btn-stop"
            >
              ⛔
            </button>
          </div>

          {errorMessage && <p className="error-message">{errorMessage}</p>}

          {isListening && (
            <p className="recording-status">
              🔴 Đang ghi âm
            </p>
          )}

          {voiceText ? (
            <div className="voice-text-box">
              <strong>🎧 Văn bản giọng nói:</strong>
              <p>{voiceText}</p>
            </div>
          ) : (
            <div className="voice-text-box">Chưa có văn bản giọng nói</div>
          )}
        </div>

        <div className="file-description">
          {voiceText ? (
            <div className="highlight-preview">
              <strong>Kết quả đối chiếu giọng nói:</strong>
              <div className="highlight-box">
                {highlightMatchedWords(text, voiceText)}
              </div>
            </div>
          ) : (
            <div
              style={{ padding: "4px", fontSize: "16px", fontWeight: "bold" }}
            >
              Voice để đối chiếu kết quả.
            </div>
          )}
          <h3>Chỉnh sửa văn bản tại đây để so sánh</h3>
          <textarea
            placeholder="Nhập một đoạn văn từ file để so sánh"
            className="text-override-box"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default App;