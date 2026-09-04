import { logo } from "../../assets";


function Preloader() {
  return (
    <div className="bg-light dark:bg-dark fixed left-0 top-0 flex h-screen w-screen flex-col items-center justify-center">
      <img
        alt="Advocate"
        className="w-42 animate-fade-upwards opacity-100 rounded-3xl"
        loading="lazy"
        src="https://image.pitchbook.com/XQ1A9w1KY40pnhmGdQ7bPbswfQ11725617698072_200x200"
      />

      <div className="mt-4 h-2 w-3/4 rounded bg-gray-200 md:w-1/2 dark:bg-gray-700">
        <div
          className="bg-primary dark:bg-primary animate-progress h-2 rounded"
          style={{ width: "100%" }}
        ></div>
      </div>
    </div>
  );
}

export default Preloader;
