export type PdfVariableDefinition = {
  key: string
  label: string
  group: string
  description: string
  example: string
}

function variable(key: string, group: string, example = ""):
  PdfVariableDefinition {
  const label = key.split(".").slice(1).join(" ").replaceAll("_", " ")
  return {
    key,
    group,
    example,
    label: label.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: `${group} value from the selected record.`,
  }
}

export const PDF_VARIABLES: PdfVariableDefinition[] = []
