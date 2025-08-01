// src/pages/AddProduct.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function AddProduct() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    price: 0,
    quantity: 0,
    unitMesure: "",
    category: "",
    description: "",
    stock: 0,
    barCode: 0
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === "price" || name === "quantity" || name === "stock" || name === "barCode" ? Number(value) : value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("http://localhost:3000/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error("Error creating product")
      alert("Producto creado correctamente")
      navigate("/inventory")
    } catch (err) {
      console.error(err)
      alert("Error al crear producto")
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Agregar producto</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        {Object.entries(formData).map(([key, value]) => (
          <div key={key}>
            <label className="block mb-1 capitalize">{key}</label>
            <input
              type="text"
              name={key}
              value={value}
              onChange={handleChange}
              className="p-2 border rounded w-full"
            />
          </div>
        ))}
        <button type="submit" className="col-span-2 bg-[#14144f] text-white p-2 rounded">
          Guardar producto
        </button>
      </form>
    </div>
  )
}
