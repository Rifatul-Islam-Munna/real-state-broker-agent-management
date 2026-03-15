export type PropertyManagementListing = {
  id: string
  imageSrc: string
  imageAlt: string
  addressLine1: string
  addressLine2: string
  propertyType: "Residential" | "Commercial"
  listingType: "For Sale" | "For Rent"
  price: string
  agent: string
  status: "Open" | "Closed"
  daysOnMarket: number
}

export const propertyManagementListings: PropertyManagementListing[] = [
  {
    id: "maple-estate",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAcIXKDCR-rsDFRkQ1tFh2LeRqEYU6XJmRrnX65tRKnaOEQ_bajmmfRu3Eh6Q3cOnEsc9PdFrELY9_6nJnkC4u6QR96wJ4vnw-pXaW1gBygQFv8bco0HCCB0amj6E6eDp1uLuaROaBIlvUH_sF79WNmYT2jrwL_qPTECpufPvcCAM9wuGtHi0P44gg1Fu1i2bQlE3aHhEuYJAoPtB6Kwnab0-nk8nZTvsBHn_7A4XsylLQbd8YnWDbFQAaDYjBm09JcUxIa4v69kgA",
    imageAlt: "Modern luxury house facade with green lawn",
    addressLine1: "123 Maple St",
    addressLine2: "Beverly Hills, CA 90210",
    propertyType: "Residential",
    listingType: "For Sale",
    price: "$2,500,000",
    agent: "John Doe",
    status: "Open",
    daysOnMarket: 12,
  },
  {
    id: "oak-office",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDFoJDgVhCVKSytto9xa2zbG7qyqWizAvO3es42K34gaqCKNDqXo3BttbzhVNW0y_WJDPi5p5A5ZotO2euXa6zl6p-3vmvl2jocqssUziLq_KZX2eEDnTQ7F-QZSTzNEHL27rmdMzdVzX7GuQ42G20L1mIAXPghchxF-LmXM03D92q_C_5MBiwDfPOcHTBIUqsH7Wec3yra5S0dJuARjXtCKQwgusvlmrhquKz1RdtV8Nt-5WBwSWtFsfYGU0Z536Ssh-6q7nLpZrk",
    imageAlt: "Glass office building in downtown area",
    addressLine1: "456 Oak Ave",
    addressLine2: "Miami, FL 33101",
    propertyType: "Commercial",
    listingType: "For Rent",
    price: "$850,000",
    agent: "Jane Smith",
    status: "Open",
    daysOnMarket: 57,
  },
  {
    id: "pine-family-home",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB8vQx4WzQaHy9gESdGz8Fvs3B3Y4MoA_zCUT9w1BiNf1BHkLPcs3q5___RrmtqUA0ajVsBm_rRpaKOF7y7JeBCjGQEB9pa8uQPwLH83kdNVSV8pKADWwKjUi_yhk6MTk4s2mW86GzW7CmL9LgEg_Yat8ABa8ekSsdvDnGbWVhc5u8qP4xm-OUC8ovaYkO1pR_OoSQVLslQjPImNs5JxxqGTjXB796jguPZ8N_KGblcV0kWRkkqGjKSaod2ieduSpJJeQqoPWV4qSo",
    imageAlt: "Small cozy suburban family home",
    addressLine1: "789 Pine Rd",
    addressLine2: "Austin, TX 78701",
    propertyType: "Residential",
    listingType: "For Sale",
    price: "$450,000",
    agent: "Mike Ross",
    status: "Closed",
    daysOnMarket: 8,
  },
  {
    id: "harbor-view",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBwD7EaqJPaRK2uGo4zE41Yjd-7Zv7ZTKLIaMrBO_NtPdsknkgw5kGTitG157P6-ak7ohUQSUG1pY3ZA_GtOBHi5OoPy2OVdt_PXH3Drwz-fyTZWZL8M_0GXcIGiQWCPV70lzrxXAqpledoku7EvQ0qp6568noBVunBS18U8r0pOeJkFTsIQqHiskTLWglwMCA-DvfWqORG_KwwSInEPjk_QE7MU2jR0QZF8rDI986Lk3_b9kKDSj_sXlVzIuKKAxa6TDzjcf6tkqA",
    imageAlt: "Modern condo building by the waterfront",
    addressLine1: "12 Harbor View",
    addressLine2: "Miami, FL 33139",
    propertyType: "Residential",
    listingType: "For Rent",
    price: "$5,200/mo",
    agent: "Sarah Jenkins",
    status: "Open",
    daysOnMarket: 64,
  },
  {
    id: "sunset-plaza",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMAzQcHQiFNlb8MDXI4VzqCjdWt74_en9YG0KVRBBH7J6AfBRYWWzZ0yHxwdT0uu4s69FL_wgJWoKcXqHcEzA6aE4HMpp0_cx2SzQX3018lEl4wrZsyWIqzGTiDii6CIYlWz6H3rw1IWZzdCuwRtk2Pi_ckulqd49bFc9BOuLmEB4urrqDsdGkTsunmpVLTnLjXo1qiQgt2LWM2lUwJLC_9BY-_WuNY0mbkbuBk9y5gJ4XOuqcdRmU2nKOoaBoMjbPX9blVmGEa4",
    imageAlt: "Coastal estate with panoramic ocean views",
    addressLine1: "900 Sunset Plaza",
    addressLine2: "Malibu, CA 90265",
    propertyType: "Residential",
    listingType: "For Sale",
    price: "$3,300,000",
    agent: "Rachel Zane",
    status: "Closed",
    daysOnMarket: 21,
  },
]
