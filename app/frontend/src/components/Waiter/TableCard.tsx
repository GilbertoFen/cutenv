import { useNavigate } from 'react-router-dom';
import type { Table } from '../../types';  

const TableCard = (props: { table: Table }) => {
  const { table } = props;
    const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/waiter/table/${table.id}`);
  };
  const isOcuppied = table.status === 'ocupada';
  

  return (
    <div
      onClick={handleClick}
      className={`p-6 rounded-xl cursor-pointer shadow transition hover:scale-[1.02] hover:shadow-lg border shadow-xl bg-white'`}
    >
      <h2 className={`text-xl font-bold  text-center text-black`}>
        MESA {table.number}
      </h2>
      <div className={`font-bold text-center ${isOcuppied ? 'bg-[#646cffaa]' :'border-2 border-[#646cffaa] bg-white'} rounded p-1`}>
        <p className={`text-black text-sm text-center`}>
          {table.status.toUpperCase()}
        </p>
      </div>
      <p className={` text-center font-bold text-black text-sm`}>
        Capacidad: {table.capacity}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {Array(table.capacity).fill(null).map((_, index) => (
          <span key={index} className="text-center text-xl">{'👤'}</span>
        ))}
      </div>
    </div>
  );
};

export default TableCard;
