import FarmlandCard from "./FarmlandCard/FarmlandCard";

const FarmlandsList = ({ farmlands, onClick }) => {
  const onViewHandler = (id) => {
    onClick(id);
  };
  return (
    <div>
      {farmlands.map((farm) => (
        <FarmlandCard
          type={farm.type}
          area={farm.area}
          perimeter={farm.perimeter}
          location={farm.location}
          ownerDisplayName={farm.ownerDisplayName}
          key={farm.id}
          id={farm.id}
          onView={onViewHandler}
        />
      ))}
    </div>
  );
};

export default FarmlandsList;
