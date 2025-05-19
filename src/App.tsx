import { useRef, useState } from "react";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

function App() {
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceText("");
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setVoiceText(result);
    };

    recognition.onerror = (event: any) => {
      console.error("Recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const [text, setText] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async () => {
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n\n";
        }

        setText(fullText);
      };
      reader.readAsArrayBuffer(file);
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;

        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setText(result.value);
        } catch (err) {
          console.error("Lỗi đọc file Word:", err);
          setText("Không thể đọc file Word.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setText("Chỉ hỗ trợ file PDF và Word (.docx).");
    }
  };

  function highlightMatchedWords(pdfText: string, voiceText: string) {
    if (!voiceText.trim()) return pdfText;

    const voiceWords = voiceText.toLowerCase().split(/\s+/).filter(Boolean);
    const voiceWordSet = new Set(voiceWords);
    const wordsWithSeparators = pdfText.split(/(\s+)/);

    const result: React.ReactNode[] = wordsWithSeparators.map((word, index) => {
      const cleanWord = word.trim().toLowerCase();

      if (voiceWordSet.has(cleanWord)) {
        return (
          <span key={index} className="highlight">
            {word}
          </span>
        );
      }

      return word;
    });

    return result;
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Đọc file PDF</h1>
        <div className="file-section">
          <input
            type="file"
            id="fileInput"
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          <div
            onClick={() => {
              const fileInput = document.getElementById(
                "fileInput"
              ) as HTMLInputElement;
              fileInput?.click();
            }}
            className="file-input"
          >
            Chọn file
          </div>
          <div className="file-description">
            <p>Chọn file PDF hoặc Word để đọc nội dung.</p>
          </div>
        </div>

        <div className="voice-section">
          <div className="btn-group">
            <button
              onClick={startListening}
              disabled={isListening}
              className="btn btn-mic"
              title="Ghi âm"
            >
              🎤
            </button>
            <button
              onClick={stopListening}
              disabled={!isListening}
              className="btn btn-stop"
              title="Dừng ghi"
            >
              ❌
            </button>
          </div>

          <div className="voice-text-box">
            <strong>Văn bản từ giọng nói:</strong>
            <div>{voiceText || "Chưa có dữ liệu."}</div>
          </div>
        </div>
        <div className="pdf-text-box">
          {text ? highlightMatchedWords(text, voiceText) : "Chưa có nội dung."}
        </div>
      </div>
    </div>
  );
}

export default App;
