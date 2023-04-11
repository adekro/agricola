import FarmlandCard from "./FarmlandCard/FarmlandCard";

const FarmlandsList = ({ farmlands }) => {
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
        />
      ))}
    </div>
  );
};

export default FarmlandsList;
