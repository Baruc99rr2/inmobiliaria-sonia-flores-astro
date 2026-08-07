import React from 'react'

const HeroStats = () => {
  const stats = [
    {number: "15+" , label: "Years Experience"},
    { number: "5+", label: "Master Chefs" },
    { number: "200+", label: "Daily Visitors" },
    { number: "35+", label: "Achievements" },
  ]
  return (
    <div className='bg-black text-white py-10 -mt-14'>
      <div className='max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center'>
        {stats.map((stat, index) => (
          <div key={index} className='flex flex-col items-center'>
            <h2 className='text-4xl font-bold text-red-500'>{stat.number} </h2>
            <p className='mt-2 text-lg'>{stat.label} </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HeroStats