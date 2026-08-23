const reasons = [
  {
    icon: "🔥",
    title: "Sazón a Leña",
    text: "Cocinamos con técnicas tradicionales que le dan ese sabor inconfundible a nuestros platos.",
  },
  {
    icon: "⏱️",
    title: "Pedidos Rápidos",
    text: "No necesitas reservar. Arma tu pedido, envíalo por WhatsApp y recíbelo caliente en casa.",
  },
  {
    icon: "❤️",
    title: "Tradición de 30 Años",
    text: "El lugar favorito de los riohacheros. Calidad garantizada en cada comida.",
  },
];

export function WhyUs() {
  return (
    <section className="bg-dark py-16 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 text-center md:grid-cols-3">
        {reasons.map((reason) => (
          <div key={reason.title}>
            <div className="mb-3 text-4xl">{reason.icon}</div>
            <h3 className="mb-2 text-xl font-bold text-secondary">
              {reason.title}
            </h3>
            <p className="text-gray-400">{reason.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
