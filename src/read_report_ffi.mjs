/**
 * Reads the uploaded file from a file input element by id and returns its contents as a string.
 * @param {string} inputId - The id of the file input element.
 * @returns {Promise<string>} - Promise resolving to the file contents.
 */
export function readUploadedFile(inputId) {
    return new Promise((resolve, reject) => {
        const input = document.getElementById(inputId);
        if (!input || !input.files || input.files.length === 0) {
            reject(new Error("No file selected"));
            return;
        }
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    })
}
