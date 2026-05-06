import { FileUpload } from "./components/FileUpload";

function App() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <FileUpload />
      </div>
    </main>
  );
}

export default App;
