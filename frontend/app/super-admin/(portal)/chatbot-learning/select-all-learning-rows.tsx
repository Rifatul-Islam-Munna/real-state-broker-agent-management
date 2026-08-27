"use client"

export function SelectAllLearningRows() {
  return (
    <input
      aria-label="Select all learning rows on this page"
      type="checkbox"
      className="size-4"
      onChange={(event) => {
        document
          .querySelectorAll<HTMLInputElement>('input[data-chatbot-learning-row="true"]')
          .forEach((input) => {
            input.checked = event.currentTarget.checked
          })
      }}
    />
  )
}
